import 'dotenv/config';
import fetch from 'node-fetch';
import { upsertMultiple as upsertLeads, calculatePriorityScore } from '../src/repositories/leads.js';
import { addActivity } from '../src/repositories/activities.js';
import { getCursor, setCursor, startSyncRun, finishSyncRun } from '../src/repositories/sync.js';

const SOURCE = 'reddit-sysadmin';
const SUBREDDITS = process.env.HTI_REDDIT_SUBS?.split(',')?.map((s) => s.trim()).filter(Boolean) || ['sysadmin', 'ITManagers'];
const KEYWORDS = ['surplus', 'donation', 'refresh', 'laptop', 'equipment', 'chromebook'];

async function fetchSubreddit(subreddit, after) {
  const params = new URLSearchParams({ limit: '25' });
  if (after) params.set('after', after);
  const url = `https://www.reddit.com/r/${subreddit}/new.json?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'hti-bridge-bot/0.1 (contact: engineering@hubzonetech.org)'
    }
  });
  if (!res.ok) {
    throw new Error(`Reddit request failed ${res.status}`);
  }
  const data = await res.json();
  return data.data;
}

function parsePost(post, subreddit) {
  const text = `${post.title} ${post.selftext || ''}`.toLowerCase();
  if (!KEYWORDS.some((keyword) => text.includes(keyword))) return null;

  const estimatedQuantity = extractQuantity(post.title) || 0;

  const lead = {
    id: `R${post.id.toUpperCase()}`,
    title: post.title,
    company: `[Reddit] ${subreddit}`,
    source: `Reddit (r/${subreddit})`,
    location: post.link_flair_text || 'Online',
    equipmentType: inferEquipmentType(post.title + ' ' + post.selftext),
    estimatedQuantity,
    status: 'Researching',
    timeline: 'Community sourced',
    notes: `https://www.reddit.com${post.permalink}`,
    followUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  };
  lead.priority = calculatePriorityScore(lead);
  return lead;
}

function extractQuantity(text) {
  const match = text.match(/(\d{2,5})\s*(laptops|devices|pcs|units)/i);
  if (match) return Number(match[1]);
  const alt = text.match(/\b(\d{2,5})\b/);
  if (alt) return Number(alt[1]);
  return 0;
}

function inferEquipmentType(text) {
  const lowered = text.toLowerCase();
  if (lowered.includes('chromebook')) return 'Chromebooks';
  if (lowered.includes('tablet')) return 'Tablets';
  if (lowered.includes('desktop')) return 'Desktop Computers';
  if (lowered.includes('laptop') || lowered.includes('thinkpad')) return 'Business Laptops';
  return 'Mixed Equipment';
}

async function run() {
  const syncRun = startSyncRun(SOURCE);
  try {
    let itemCount = 0;
    for (const subreddit of SUBREDDITS) {
      const cursorKey = `${SOURCE}:${subreddit}`;
      let after = getCursor(cursorKey);
      const data = await fetchSubreddit(subreddit, after);
      const leads = [];
      let latestName = after;

      for (const child of data.children) {
        latestName = child.data.name;
        const lead = parsePost(child.data, subreddit);
        if (lead) {
          leads.push(lead);
        }
      }

      if (leads.length) {
        upsertLeads(leads);
        itemCount += leads.length;
        addActivity({
          text: `Reddit ingestion captured ${leads.length} potential leads from r/${subreddit}`,
          type: 'automation'
        });
      }

      if (latestName) {
        setCursor(cursorKey, latestName);
      }
    }

    finishSyncRun(syncRun.id, { success: true, itemCount, notes: 'Reddit ingestion completed' });
    console.log(`Reddit ingestion finished; ${itemCount} leads added/updated.`);
  } catch (error) {
    console.error('Reddit ingestion failed', error);
    finishSyncRun(syncRun.id, { success: false, itemCount: 0, notes: error.message });
    process.exitCode = 1;
  }
}

run();
