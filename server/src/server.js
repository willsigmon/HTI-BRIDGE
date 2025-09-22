import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { attachUser, requirePermission, authenticateApiKey } from './middleware/auth.js';
import { buildDashboardSummary } from './services/dashboard.js';
import { mapLeadsToGeo } from './services/geocode.js';
import { listLeads, createLead, updateLead, deleteLead, getLeadById, summarizeLeads } from './repositories/leads.js';
import { listCorporateTargets, upsertCorporateTarget } from './repositories/corporateTargets.js';
import { listMilestones } from './repositories/milestones.js';
import { listActivities, addActivity } from './repositories/activities.js';
import { listSyncLog } from './repositories/sync.js';
import { listUnifiedRecords, summarizeEntities, mergeContacts, buildDedupIndex } from './repositories/entities.js';
import {
  listPipelines,
  createPipeline,
  updatePipeline,
  upsertStage,
  buildPipelineBoard,
  ensureDefaultPipelines,
  summarizePipelines
} from './repositories/pipelines.js';
import {
  listAutomations,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  listAutomationExecutions,
  listTasks,
  completeTask
} from './repositories/automations.js';
import { listUsers, listWorkspaces, listApiKeys, createApiKey, revokeApiKey } from './repositories/security.js';
import { ensureDefaultJobs, listIngestionJobs, updateIngestionJob, recordIngestionRun } from './repositories/admin.js';
import {
  listConnectors,
  registerConnector,
  updateConnector,
  ingestCsvInteractions,
  ingestIcsCalendar,
  listInteractionEvents
} from './repositories/connectors.js';
import {
  listIntakeForms,
  createIntakeForm,
  updateIntakeForm,
  getIntakeFormBySlug,
  generateEmbedSnippet
} from './repositories/forms.js';
import { listAuditLog, summarizeAuditLog } from './repositories/audit.js';
import { getSettings, updateSettings as saveSettings } from './repositories/settings.js';

ensureDefaultPipelines();
ensureDefaultJobs();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(attachUser);

app.get('/healthz', (req, res) => {
  res.json({ ok: true, status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/bootstrap', requirePermission('leads:read'), (req, res) => {
  const workspaceId = req.query.workspaceId || req.workspaceId;
  res.json({
    leads: listLeads({ workspaceId }),
    corporateTargets: listCorporateTargets(),
    grantMilestones: listMilestones(),
    activities: listActivities(20),
    dashboard: buildDashboardSummary({ workspaceId }),
    syncLog: listSyncLog(20),
    entities: listUnifiedRecords({ workspaceId }),
    pipelines: listPipelines({ workspaceId }),
    automations: listAutomations({ workspaceId }),
    tasks: listTasks({ workspaceId, status: 'open' }),
    ingestionJobs: listIngestionJobs(),
    audit: listAuditLog({ limit: 25 }),
    connectors: listConnectors({ workspaceId }),
    forms: listIntakeForms({ workspaceId }),
    interactions: listInteractionEvents({ limit: 200 }),
    settings: getSettings(),
    analytics: {
      leads: summarizeLeads({ workspaceId }),
      pipeline: summarizePipelines(),
      entities: summarizeEntities()
    }
  });
});

app.get('/api/dashboard', requirePermission('analytics:view'), (req, res) => {
  const workspaceId = req.query.workspaceId || req.workspaceId;
  res.json(buildDashboardSummary({ workspaceId }));
});

app.get('/api/leads', requirePermission('leads:read'), (req, res) => {
  const { status, source, priority, persona, search, pipelineId, stageId, ownerId } = req.query;
  const workspaceId = req.query.workspaceId || req.workspaceId;
  res.json(
    listLeads({ status, source, priority, persona, search, pipelineId, stageId, ownerId, workspaceId })
  );
});

app.post('/api/leads', requirePermission('leads:write'), (req, res) => {
  try {
    const lead = createLead({ ...req.body, workspaceId: req.workspaceId }, { actorId: req.user.id });
    addActivity({
      text: `Lead logged: ${lead.title} (${lead.company || 'Unknown org'})`,
      type: 'lead'
    });
    res.status(201).json(lead);
  } catch (error) {
    console.error('Error creating lead', error);
    res.status(400).json({ error: 'Unable to create lead' });
  }
});

app.patch('/api/leads/:id', requirePermission('leads:write'), (req, res) => {
  const { id } = req.params;
  const lead = updateLead(id, req.body, { actorId: req.user.id });
  if (!lead) {
    res.status(404).json({ error: 'Lead not found' });
    return;
  }
  addActivity({ text: `Lead updated: ${lead.title}`, type: 'update' });
  res.json(lead);
});

app.delete('/api/leads/:id', requirePermission('leads:write'), (req, res) => {
  const { id } = req.params;
  const lead = getLeadById(id);
  if (!lead) {
    res.status(404).json({ error: 'Lead not found' });
    return;
  }
  deleteLead(id);
  addActivity({ text: `Lead archived: ${lead.title}`, type: 'archive' });
  res.status(204).send();
});

app.post('/api/leads/:id/complete-follow-up', requirePermission('leads:write'), (req, res) => {
  const { id } = req.params;
  const nextDate = req.body.followUpDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const lead = updateLead(id, { followUpDate: nextDate }, { actorId: req.user.id });
  if (!lead) {
    res.status(404).json({ error: 'Lead not found' });
    return;
  }
  addActivity({ text: `Follow-up completed for ${lead.title}`, type: 'update' });
  res.json({ ...lead, followUpDate: nextDate });
});

app.get('/api/pipelines', requirePermission('pipelines:read'), (req, res) => {
  const workspaceId = req.query.workspaceId || req.workspaceId;
  res.json(listPipelines({ workspaceId }));
});

app.post('/api/pipelines', requirePermission('pipelines:manage'), (req, res) => {
  try {
    const pipeline = createPipeline({ ...req.body, workspaceId: req.workspaceId }, { actorId: req.user.id });
    res.status(201).json(pipeline);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/pipelines/:id', requirePermission('pipelines:manage'), (req, res) => {
  const pipeline = updatePipeline(req.params.id, req.body, { actorId: req.user.id });
  if (!pipeline) {
    res.status(404).json({ error: 'Pipeline not found' });
    return;
  }
  res.json(pipeline);
});

app.post('/api/pipelines/:id/stages', requirePermission('pipelines:manage'), (req, res) => {
  try {
    const stage = upsertStage(req.params.id, req.body, { actorId: req.user.id });
    res.status(201).json(stage);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/pipelines/:id/stages/:stageId', requirePermission('pipelines:manage'), (req, res) => {
  try {
    const stage = upsertStage(req.params.id, { ...req.body, id: req.params.stageId }, { actorId: req.user.id });
    res.json(stage);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/pipelines/:id/assign', requirePermission('leads:assign'), (req, res) => {
  const { leadId, stageId } = req.body;
  if (!leadId || !stageId) {
    res.status(400).json({ error: 'leadId and stageId are required' });
    return;
  }
  const lead = updateLead(leadId, { pipelineId: req.params.id, stageId }, { actorId: req.user.id });
  if (!lead) {
    res.status(404).json({ error: 'Lead not found' });
    return;
  }
  res.json(lead);
});

app.get('/api/pipelines/:id/board', requirePermission('pipelines:read'), (req, res) => {
  const leads = listLeads({ workspaceId: req.workspaceId, pipelineId: req.params.id });
  const board = buildPipelineBoard(req.params.id, leads);
  if (!board) {
    res.status(404).json({ error: 'Pipeline not found' });
    return;
  }
  res.json(board);
});

app.get('/api/automations', requirePermission('automations:read'), (req, res) => {
  const workspaceId = req.query.workspaceId || req.workspaceId;
  res.json(listAutomations({ workspaceId }));
});

app.post('/api/automations', requirePermission('automations:manage'), (req, res) => {
  try {
    const automation = createAutomation({ ...req.body, workspaceId: req.workspaceId }, { actorId: req.user.id });
    res.status(201).json(automation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/automations/:id', requirePermission('automations:manage'), (req, res) => {
  const automation = updateAutomation(req.params.id, req.body, { actorId: req.user.id });
  if (!automation) {
    res.status(404).json({ error: 'Automation not found' });
    return;
  }
  res.json(automation);
});

app.delete('/api/automations/:id', requirePermission('automations:manage'), (req, res) => {
  const ok = deleteAutomation(req.params.id, { actorId: req.user.id });
  if (!ok) {
    res.status(404).json({ error: 'Automation not found' });
    return;
  }
  res.status(204).send();
});

app.get('/api/automations/:id/executions', requirePermission('automations:read'), (req, res) => {
  res.json(listAutomationExecutions({ automationId: req.params.id, limit: Number(req.query.limit) || 50 }));
});

app.get('/api/tasks', requirePermission('leads:read'), (req, res) => {
  const workspaceId = req.query.workspaceId || req.workspaceId;
  res.json(listTasks({ workspaceId, status: req.query.status }));
});

app.patch('/api/tasks/:id/complete', requirePermission('leads:write'), (req, res) => {
  const task = completeTask(req.params.id, { actorId: req.user.id });
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.json(task);
});

app.get('/api/entities', requirePermission('contacts:read'), (req, res) => {
  const { search, type } = req.query;
  const workspaceId = req.query.workspaceId || req.workspaceId;
  res.json(listUnifiedRecords({ search, type, workspaceId }));
});

app.get('/api/entities/dedupe', requirePermission('contacts:read'), (req, res) => {
  res.json(buildDedupIndex());
});

app.post('/api/entities/:primaryId/merge', requirePermission('contacts:write'), (req, res) => {
  const { duplicateId } = req.body;
  const merged = mergeContacts(req.params.primaryId, duplicateId, { actorId: req.user.id });
  if (!merged) {
    res.status(404).json({ error: 'Unable to merge contacts' });
    return;
  }
  res.json(merged);
});

app.get('/api/admin/ingestion', requirePermission('ingestion:read'), (req, res) => {
  res.json(listIngestionJobs());
});

app.patch('/api/admin/ingestion/:id', requirePermission('ingestion:manage'), (req, res) => {
  const job = updateIngestionJob(req.params.id, req.body, { actorId: req.user.id });
  if (!job) {
    res.status(404).json({ error: 'Ingestion job not found' });
    return;
  }
  res.json(job);
});

app.post('/api/admin/ingestion/:id/run', requirePermission('ingestion:manage'), (req, res) => {
  const start = Date.now();
  const job = recordIngestionRun(
    req.params.id,
    {
      success: req.body.success !== false,
      itemCount: req.body.itemCount || 0,
      durationMs: Date.now() - start,
      notes: req.body.notes
    },
    { actorId: req.user.id }
  );
  if (!job) {
    res.status(404).json({ error: 'Ingestion job not found' });
    return;
  }
  res.json(job);
});

app.get('/api/security/users', requirePermission('security:manage'), (req, res) => {
  res.json({ users: listUsers(), workspaces: listWorkspaces() });
});

app.get('/api/security/api-keys', requirePermission('security:manage'), (req, res) => {
  const workspaceId = req.query.workspaceId || req.workspaceId;
  res.json(listApiKeys({ workspaceId }));
});

app.post('/api/security/api-keys', requirePermission('security:manage'), (req, res) => {
  try {
    const apiKey = createApiKey({ ...req.body, workspaceId: req.workspaceId }, { actorId: req.user.id });
    res.status(201).json(apiKey);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/security/api-keys/:id', requirePermission('security:manage'), (req, res) => {
  const ok = revokeApiKey(req.params.id, req.user.id);
  if (!ok) {
    res.status(404).json({ error: 'API key not found' });
    return;
  }
  res.status(204).send();
});

app.get('/api/forms', requirePermission('forms:read'), (req, res) => {
  const workspaceId = req.query.workspaceId || req.workspaceId;
  res.json(listIntakeForms({ workspaceId }));
});

app.post('/api/forms', requirePermission('forms:manage'), (req, res) => {
  try {
    const form = createIntakeForm({ ...req.body, workspaceId: req.workspaceId }, { actorId: req.user.id });
    res.status(201).json(form);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/forms/:id', requirePermission('forms:manage'), (req, res) => {
  const form = updateIntakeForm(req.params.id, req.body, { actorId: req.user.id });
  if (!form) {
    res.status(404).json({ error: 'Form not found' });
    return;
  }
  res.json(form);
});

app.get('/api/forms/:id/embed', requirePermission('forms:read'), (req, res) => {
  const form = listIntakeForms().find((item) => item.id === req.params.id);
  if (!form) {
    res.status(404).json({ error: 'Form not found' });
    return;
  }
  res.type('text/plain').send(generateEmbedSnippet(form));
});

app.get('/api/settings', requirePermission('settings:read'), (req, res) => {
  res.json(getSettings());
});

app.put('/api/settings', requirePermission('settings:manage'), (req, res) => {
  try {
    const settings = saveSettings(req.body, { actorId: req.user.id });
    res.json(settings);
  } catch (error) {
    console.error('Failed to update settings', error);
    res.status(400).json({ error: 'Unable to update settings' });
  }
});

app.get('/api/connectors', requirePermission('connectors:manage'), (req, res) => {
  const workspaceId = req.query.workspaceId || req.workspaceId;
  res.json(listConnectors({ workspaceId }));
});

app.post('/api/connectors', requirePermission('connectors:manage'), (req, res) => {
  const connector = registerConnector({ ...req.body, workspaceId: req.workspaceId }, { actorId: req.user.id });
  res.status(201).json(connector);
});

app.patch('/api/connectors/:id', requirePermission('connectors:manage'), (req, res) => {
  const connector = updateConnector(req.params.id, req.body, { actorId: req.user.id });
  if (!connector) {
    res.status(404).json({ error: 'Connector not found' });
    return;
  }
  res.json(connector);
});

app.post('/api/connectors/import/csv', requirePermission('connectors:manage'), (req, res) => {
  if (!req.body.csv) {
    res.status(400).json({ error: 'csv field required' });
    return;
  }
  const interactions = ingestCsvInteractions(
    {
      csvContent: req.body.csv,
      mapping: req.body.mapping,
      workspaceId: req.workspaceId,
      source: req.body.source || 'csv-upload'
    },
    { actorId: req.user.id }
  );
  res.json({ count: interactions.length, interactions });
});

app.post('/api/connectors/import/ics', requirePermission('connectors:manage'), (req, res) => {
  if (!req.body.ics) {
    res.status(400).json({ error: 'ics field required' });
    return;
  }
  const events = ingestIcsCalendar(
    {
      icsContent: req.body.ics,
      workspaceId: req.workspaceId,
      source: req.body.source || 'calendar-upload'
    },
    { actorId: req.user.id }
  );
  res.json({ count: events.length, events });
});

app.get('/api/interactions', requirePermission('leads:read'), (req, res) => {
  res.json(listInteractionEvents({ leadId: req.query.leadId, limit: Number(req.query.limit) || 100 }));
});

app.get('/api/audit', requirePermission('security:manage'), (req, res) => {
  res.json({ entries: listAuditLog({ limit: Number(req.query.limit) || 50 }), summary: summarizeAuditLog() });
});

app.get('/api/analytics/pipeline', requirePermission('analytics:view'), (req, res) => {
  res.json(summarizePipelines());
});

app.get('/api/analytics/entities', requirePermission('analytics:view'), (req, res) => {
  res.json(summarizeEntities());
});

app.get('/api/maps/leads', requirePermission('leads:read'), (req, res) => {
  const workspaceId = req.query.workspaceId || req.workspaceId;
  const leads = listLeads({ workspaceId });
  res.json(mapLeadsToGeo(leads));
});

app.get('/api/corporate-targets', requirePermission('leads:read'), (req, res) => {
  const { priority } = req.query;
  res.json(listCorporateTargets({ priority }));
});

app.post('/api/corporate-targets', requirePermission('leads:write'), (req, res) => {
  try {
    const company = upsertCorporateTarget(req.body);
    addActivity({ text: `Corporate target updated: ${company.company}`, type: 'corporate' });
    res.status(201).json(company);
  } catch (error) {
    console.error('Error upserting corporate target', error);
    res.status(400).json({ error: 'Unable to save corporate target' });
  }
});

app.get('/api/milestones', requirePermission('analytics:view'), (req, res) => {
  res.json(listMilestones());
});

app.get('/api/activities', requirePermission('leads:read'), (req, res) => {
  const limit = Number(req.query.limit) || 20;
  res.json(listActivities(limit));
});

app.get('/api/sync-log', requirePermission('ingestion:read'), (req, res) => {
  const limit = Number(req.query.limit) || 50;
  res.json(listSyncLog(limit));
});

app.get('/external/forms/:slug.html', (req, res) => {
  const form = getIntakeFormBySlug(req.params.slug);
  if (!form) {
    res.status(404).send('Form not found');
    return;
  }
  const html = renderIntakeFormHtml(form);
  res.type('text/html').send(html);
});

app.post('/external/intake/:slug', (req, res) => {
  const form = getIntakeFormBySlug(req.params.slug);
  if (!form) {
    res.status(404).json({ error: 'Form not found' });
    return;
  }
  const apiKey = authenticateApiKey(req);
  if (form.apiKeyId && (!apiKey || apiKey.id !== form.apiKeyId)) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }
  try {
    const payload = mapFormSubmissionToLead(form, req.body);
    const lead = createLead(payload, { actorId: 'intake-api' });
    addActivity({ text: `External intake received for ${lead.company}`, type: 'intake' });
    res.status(201).json({ ok: true, leadId: lead.id, message: form.successMessage });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.use((err, req, res, next) => {
  console.error('Unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`HTI API listening on http://localhost:${PORT}`);
  });
}

export default app;

function renderIntakeFormHtml(form) {
  const action = `${process.env.API_BASE_URL || ''}/external/intake/${form.slug}`;
  const fieldsHtml = form.fields
    .map((field) => {
      const common = `name="${field.id}" ${field.required ? 'required' : ''}`;
      switch (field.type) {
        case 'textarea':
          return `<label>${field.label}<textarea ${common}></textarea></label>`;
        case 'select':
          return `<label>${field.label}<select ${common}>${(field.options || [])
            .map((option) => `<option value="${option}">${option}</option>`)
            .join('')}</select></label>`;
        case 'number':
          return `<label>${field.label}<input type="number" ${common}></label>`;
        default:
          return `<label>${field.label}<input type="${field.type || 'text'}" ${common}></label>`;
      }
    })
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${form.name}</title><style>body{font-family:Arial,sans-serif;margin:0;padding:0;}form{padding:16px;border:1px solid #e2e8f0;border-radius:8px;background:#ffffff}label{display:block;margin-bottom:12px;color:#0f172a;font-size:14px}input,textarea,select{width:100%;padding:8px;margin-top:4px;border:1px solid #cbd5f5;border-radius:6px;font-size:14px}button{background:#14532d;color:white;border:none;padding:10px 16px;border-radius:6px;font-weight:600;cursor:pointer}button:hover{background:#166534}}</style></head><body><form method="post" action="${action}">${fieldsHtml}<button type="submit">Submit</button></form></body></html>`;
}

function mapFormSubmissionToLead(form, submission) {
  const data = submission || {};
  return {
    title: `${data.contactName || data.company || 'External Lead'} Intake`,
    company: data.company || data.organization || 'Unknown Organization',
    contact: data.contactName || data.contact || data.name,
    contactEmail: data.contactEmail || data.email,
    contactPhone: data.contactPhone || data.phone,
    equipmentType: data.equipmentType || data.category,
    estimatedQuantity: Number(data.quantity || data.estimatedQuantity || 0),
    source: `Intake Form:${form.slug}`,
    notes: data.notes || '',
    timeline: data.timeline || 'Submitted',
    potentialValue: data.potentialValue || 'Medium',
    workspaceId: form.workspaceId
  };
}
