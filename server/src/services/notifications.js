import fetch from 'node-fetch';
import nodemailer from 'nodemailer';

import { db, writeDb } from '../db.js';

const slackWebhook = process.env.HTI_SLACK_WEBHOOK_URL || null;
const notifyEmails = parseList(process.env.HTI_NOTIFY_EMAILS);
const emailFrom = process.env.HTI_NOTIFY_EMAIL_FROM || 'notifications@hti.local';
const smtpUrl = process.env.HTI_SMTP_URL || null;

let transporter = null;
if (smtpUrl) {
  try {
    transporter = nodemailer.createTransport(smtpUrl);
  } catch (error) {
    console.warn('Unable to initialize SMTP transport:', error.message);
  }
}

export async function notifyNewLead(lead) {
  if (!lead) return;

  const message = buildLeadMessage(lead);
  logNotification({ channel: 'summary', message, leadId: lead.id });

  const tasks = [];
  if (slackWebhook) {
    tasks.push(sendSlackMessage(slackWebhook, message).catch((error) => {
      console.warn('Slack notification failed:', error.message);
    }));
  }

  if (notifyEmails.length && transporter) {
    tasks.push(
      transporter
        .sendMail({
          from: emailFrom,
          to: notifyEmails,
          subject: `[HTI] New high-priority lead: ${lead.company}`,
          text: message
        })
        .then((info) => logNotification({ channel: 'email', messageId: info.messageId, leadId: lead.id }))
        .catch((error) => console.warn('Email notification failed:', error.message))
    );
  }

  if (tasks.length) {
    await Promise.all(tasks);
  }
}

function buildLeadMessage(lead) {
  const lines = [
    `*New ${lead.persona} lead:* ${lead.company}`,
    `Source: ${lead.source}`,
    `Quantity: ${lead.estimatedQuantity || 'N/A'} (${lead.equipmentType || 'Mixed equipment'})`,
    `Priority: ${lead.priorityLabel || lead.priority}`
  ];
  if (lead.location) lines.push(`Location: ${lead.location}`);
  if (lead.timeline) lines.push(`Timeline: ${lead.timeline}`);
  if (lead.logistics) {
    const flags = [];
    if (lead.logistics.onsitePickup) flags.push('Onsite pickup');
    if (lead.logistics.freightFriendly) flags.push('Freight covered');
    if (flags.length) lines.push(`Logistics: ${flags.join(', ')}`);
  }
  if (lead.notes) {
    const snippet = lead.notes.length > 240 ? `${lead.notes.slice(0, 237)}...` : lead.notes;
    lines.push(`Notes: ${snippet}`);
  }
  return lines.join('\n');
}

function parseList(value) {
  if (!value) return [];
  return value
    .split(/[|,]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

async function sendSlackMessage(webhookUrl, text) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  if (!response.ok) {
    throw new Error(`Slack webhook failed (${response.status})`);
  }
  logNotification({ channel: 'slack', leadId: null, message: text });
}

function logNotification(entry) {
  const log = db.data.notificationLog || [];
  log.unshift({
    id: Date.now().toString(36),
    timestamp: new Date().toISOString(),
    ...entry
  });
  db.data.notificationLog = log.slice(0, 2000);
  writeDb();
}
