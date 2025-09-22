import crypto from 'node:crypto';
import { db, writeDb } from '../db.js';

const ACTIVE_STATUSES = new Set(['New', 'Researching', 'Initial Contact', 'Qualified', 'Proposal Sent', 'Negotiating']);
const CLOSED_STATUSES = new Set(['Committed', 'Donated', 'Not Interested', 'Invalid']);

function getLeadsCollection() {
  return db.data.leads;
}

export function listLeads({ status, source, priority, search } = {}) {
  let collection = [...getLeadsCollection()];

  if (status) {
    collection = collection.filter((lead) => lead.status === status);
  }
  if (source) {
    collection = collection.filter((lead) => lead.source === source);
  }
  if (priority) {
    if (priority === 'high') {
      collection = collection.filter((lead) => (lead.priority ?? 0) >= 80);
    } else if (priority === 'medium') {
      collection = collection.filter((lead) => (lead.priority ?? 0) >= 60 && (lead.priority ?? 0) < 80);
    } else if (priority === 'low') {
      collection = collection.filter((lead) => (lead.priority ?? 0) < 60);
    }
  }
  if (search) {
    const lowered = search.toLowerCase();
    collection = collection.filter((lead) => {
      return (
        (lead.title || '').toLowerCase().includes(lowered) ||
        (lead.company || '').toLowerCase().includes(lowered) ||
        (lead.contact || '').toLowerCase().includes(lowered)
      );
    });
  }

  collection.sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0));
  return collection;
}

export function getLeadById(id) {
  return getLeadsCollection().find((lead) => lead.id === id) || null;
}

export function createLead(payload) {
  const leads = getLeadsCollection();
  const id = payload.id || generateLeadId();
  const now = new Date().toISOString();
  const record = {
    id,
    title: payload.title,
    company: payload.company,
    contact: payload.contact,
    source: payload.source,
    location: payload.location,
    equipmentType: payload.equipmentType,
    estimatedQuantity: payload.estimatedQuantity ?? 0,
    priority: payload.priority ?? calculatePriorityScore(payload),
    status: payload.status || 'New',
    timeline: payload.timeline || 'TBD',
    followUpDate: payload.followUpDate,
    notes: payload.notes,
    potentialValue: payload.potentialValue || 'Medium',
    createdAt: payload.date || now,
    updatedAt: now
  };
  leads.unshift(record);
  writeDb();
  return record;
}

export function updateLead(id, updates) {
  const leads = getLeadsCollection();
  const index = leads.findIndex((lead) => lead.id === id);
  if (index === -1) return null;
  const now = new Date().toISOString();
  const updated = {
    ...leads[index],
    ...updates,
    priority: updates.priority ?? leads[index].priority,
    followUpDate: updates.followUpDate ?? leads[index].followUpDate,
    notes: updates.notes ?? leads[index].notes,
    updatedAt: now
  };
  if (updates.status && CLOSED_STATUSES.has(updates.status)) {
    updated.timeline = 'Closed';
  }
  leads[index] = updated;
  writeDb();
  return updated;
}

export function deleteLead(id) {
  const leads = getLeadsCollection();
  const index = leads.findIndex((lead) => lead.id === id);
  if (index === -1) return false;
  leads.splice(index, 1);
  writeDb();
  return true;
}

export function summarizeLeads() {
  const leads = getLeadsCollection();
  const totalLeads = leads.length;
  const activeLeads = leads.filter((lead) => ACTIVE_STATUSES.has(lead.status)).length;
  const totalEquipment = leads.reduce((sum, lead) => sum + (lead.estimatedQuantity || 0), 0);
  const conversions = leads.filter((lead) => CLOSED_STATUSES.has(lead.status)).length;
  const conversionRate = totalLeads ? Math.round((conversions / totalLeads) * 100) : 0;
  return { totalLeads, activeLeads, totalEquipment, conversions, conversionRate };
}

export function upsertMultiple(leads) {
  if (!Array.isArray(leads) || !leads.length) return;
  const collection = getLeadsCollection();
  const byId = new Map(collection.map((lead) => [lead.id, lead]));
  const now = new Date().toISOString();

  for (const lead of leads) {
    const id = lead.id || generateLeadId();
    const existing = byId.get(id);
    const record = {
      id,
      title: lead.title,
      company: lead.company,
      contact: lead.contact,
      source: lead.source,
      location: lead.location,
      equipmentType: lead.equipmentType,
      estimatedQuantity: lead.estimatedQuantity ?? 0,
      priority: lead.priority ?? calculatePriorityScore(lead),
      status: lead.status || 'New',
      timeline: lead.timeline || existing?.timeline || 'TBD',
      followUpDate: lead.followUpDate || existing?.followUpDate,
      notes: lead.notes,
      potentialValue: lead.potentialValue || existing?.potentialValue || 'Medium',
      createdAt: lead.createdAt || lead.date || existing?.createdAt || now,
      updatedAt: now
    };

    if (existing) {
      Object.assign(existing, record);
    } else {
      collection.unshift(record);
    }
  }

  writeDb();
}

export function calculatePriorityScore(lead) {
  let score = 50;
  const quantity = Number(lead.estimatedQuantity ?? 0);
  score += Math.min(Math.round(quantity / 10), 25);

  const sourceWeights = {
    'LinkedIn': 8,
    'Professional Referral': 12,
    'Reddit (r/sysadmin)': 10,
    'Reddit (r/ITManagers)': 10,
    'SAM.gov': 9,
    'Data.gov': 6,
    'Community Tip': 14
  };
  score += sourceWeights[lead.source] || 5;

  const timeline = (lead.timeline || '').toLowerCase();
  if (timeline.includes('urgent')) score += 10;
  if (timeline.includes('immediate')) score += 12;

  return Math.max(10, Math.min(100, Math.round(score)));
}

export function convertLeadStatus(status) {
  if (CLOSED_STATUSES.has(status)) return 'Closed';
  if (ACTIVE_STATUSES.has(status)) return 'Active';
  return 'Other';
}

export function generateLeadId() {
  return 'L' + crypto.randomInt(0, 999999).toString().padStart(6, '0');
}
