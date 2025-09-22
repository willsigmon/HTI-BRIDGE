import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { buildDashboardSummary } from './services/dashboard.js';
import { listLeads, createLead, updateLead, deleteLead, getLeadById } from './repositories/leads.js';
import { listCorporateTargets, upsertCorporateTarget } from './repositories/corporateTargets.js';
import { listMilestones } from './repositories/milestones.js';
import { listActivities, addActivity } from './repositories/activities.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));

app.get('/healthz', (req, res) => {
  res.json({ ok: true, status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/bootstrap', (req, res) => {
  res.json({
    leads: listLeads(),
    corporateTargets: listCorporateTargets(),
    grantMilestones: listMilestones(),
    activities: listActivities(20),
    dashboard: buildDashboardSummary()
  });
});

app.get('/api/dashboard', (req, res) => {
  res.json(buildDashboardSummary());
});

app.get('/api/leads', (req, res) => {
  const { status, source, priority, search } = req.query;
  res.json(listLeads({ status, source, priority, search }));
});

app.post('/api/leads', (req, res) => {
  try {
    const lead = createLead(req.body);
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

app.patch('/api/leads/:id', (req, res) => {
  const { id } = req.params;
  const lead = updateLead(id, req.body);
  if (!lead) {
    res.status(404).json({ error: 'Lead not found' });
    return;
  }
  addActivity({ text: `Lead updated: ${lead.title}`, type: 'update' });
  res.json(lead);
});

app.delete('/api/leads/:id', (req, res) => {
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

app.post('/api/leads/:id/complete-follow-up', (req, res) => {
  const { id } = req.params;
  const nextDate = req.body.followUpDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const lead = updateLead(id, { followUpDate: nextDate });
  if (!lead) {
    res.status(404).json({ error: 'Lead not found' });
    return;
  }
  addActivity({ text: `Follow-up completed for ${lead.title}`, type: 'update' });
  res.json({ ...lead, followUpDate: nextDate });
});

app.get('/api/corporate-targets', (req, res) => {
  const { priority } = req.query;
  res.json(listCorporateTargets({ priority }));
});

app.post('/api/corporate-targets', (req, res) => {
  try {
    const company = upsertCorporateTarget(req.body);
    addActivity({ text: `Corporate target updated: ${company.company}`, type: 'corporate' });
    res.status(201).json(company);
  } catch (error) {
    console.error('Error upserting corporate target', error);
    res.status(400).json({ error: 'Unable to save corporate target' });
  }
});

app.get('/api/milestones', (req, res) => {
  res.json(listMilestones());
});

app.get('/api/activities', (req, res) => {
  const limit = Number(req.query.limit) || 20;
  res.json(listActivities(limit));
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
