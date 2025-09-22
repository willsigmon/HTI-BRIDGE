import crypto from 'node:crypto';
import { db, writeDb } from '../db.js';
import { logAuditEvent } from './audit.js';

function getForms() {
  return db.data.intakeForms;
}

function ensureWorkspaceId(inputWorkspaceId) {
  const workspaces = db.data.workspaces;
  if (inputWorkspaceId && workspaces.some((ws) => ws.id === inputWorkspaceId)) {
    return inputWorkspaceId;
  }
  return workspaces.length ? workspaces[0].id : null;
}

export function listIntakeForms({ workspaceId } = {}) {
  let forms = [...getForms()];
  if (workspaceId) {
    forms = forms.filter((form) => form.workspaceId === workspaceId);
  }
  forms.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  return forms;
}

export function createIntakeForm(payload, { actorId = 'system' } = {}) {
  const now = new Date().toISOString();
  const form = {
    id: crypto.randomUUID(),
    name: payload.name,
    slug: payload.slug || generateSlug(payload.name),
    description: payload.description || '',
    workspaceId: ensureWorkspaceId(payload.workspaceId),
    fields: payload.fields || defaultFields(),
    successMessage: payload.successMessage || 'Thanks! Our team will follow up within one business day.',
    apiKeyId: payload.apiKeyId || null,
    status: payload.status || 'active',
    createdAt: now,
    updatedAt: now
  };
  getForms().push(form);
  writeDb();
  logAuditEvent({
    actorId,
    action: 'form.created',
    entityType: 'intake-form',
    entityId: form.id,
    after: { name: form.name }
  });
  return form;
}

export function updateIntakeForm(id, updates, { actorId = 'system' } = {}) {
  const form = getForms().find((row) => row.id === id);
  if (!form) return null;
  const before = { ...form };
  form.name = updates.name || form.name;
  form.description = updates.description ?? form.description;
  form.fields = updates.fields || form.fields;
  form.successMessage = updates.successMessage || form.successMessage;
  form.apiKeyId = updates.apiKeyId || form.apiKeyId;
  form.status = updates.status || form.status;
  form.updatedAt = new Date().toISOString();
  writeDb();
  logAuditEvent({
    actorId,
    action: 'form.updated',
    entityType: 'intake-form',
    entityId: form.id,
    before,
    after: { ...form }
  });
  return form;
}

export function getIntakeFormBySlug(slug) {
  return getForms().find((form) => form.slug === slug && form.status !== 'archived') || null;
}

export function generateEmbedSnippet(form) {
  const baseUrl = process.env.FRONTEND_ORIGIN || 'https://newdash-azure.vercel.app';
  return `<!-- HTI Intake Form Embed -->\n<div id="hti-intake-${form.slug}"></div>\n<script>
  (function(){
    const target = document.getElementById('hti-intake-${form.slug}');
    if (!target) return;
    fetch('${baseUrl}/external/forms/${form.slug}.html')
      .then((response) => response.text())
      .then((html) => {
        target.innerHTML = html;
      })
      .catch((err) => console.error('HTI intake form failed to load', err));
  })();
</script>`;
}

function generateSlug(name = '') {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function defaultFields() {
  return [
    { id: 'company', label: 'Organization', type: 'text', required: true },
    { id: 'contactName', label: 'Primary Contact Name', type: 'text', required: true },
    { id: 'contactEmail', label: 'Email', type: 'email', required: true },
    { id: 'contactPhone', label: 'Phone', type: 'tel', required: false },
    { id: 'equipmentType', label: 'Equipment Type', type: 'select', options: ['Laptops', 'Desktops', 'Servers', 'Networking'], required: true },
    { id: 'quantity', label: 'Estimated Quantity', type: 'number', required: false },
    { id: 'notes', label: 'Notes', type: 'textarea', required: false }
  ];
}
