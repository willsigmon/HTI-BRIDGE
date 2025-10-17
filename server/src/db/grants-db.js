/**
 * Grant Database Wrapper
 * Uses lowdb for consistency with rest of HTI-BRIDGE CRM
 */

import crypto from 'node:crypto';
import { db, writeDb } from '../db.js';

// Initialize grants collections if they don't exist
if (!db.data.grants) {
  db.data.grants = [];
}
if (!db.data.grantApplications) {
  db.data.grantApplications = [];
}
if (!db.data.grantTasks) {
  db.data.grantTasks = [];
}
if (!db.data.grantReports) {
  db.data.grantReports = [];
}
if (!db.data.grantDocuments) {
  db.data.grantDocuments = [];
}
if (!db.data.grantNotifications) {
  db.data.grantNotifications = [];
}

// Simple query helpers
export const grantsDb = {
  // Grants
  getGrants: () => db.data.grants,
  getGrantById: (id) => db.data.grants.find(g => g.id === id),
  getGrantBySourceId: (source, sourceId) => db.data.grants.find(g => g.source === source && g.source_id === sourceId),
  addGrant: (grant) => {
    grant.id = grant.id || crypto.randomUUID();
    grant.created_at = grant.created_at || new Date().toISOString();
    grant.updated_at = new Date().toISOString();
    db.data.grants.push(grant);
    writeDb();
    return grant;
  },
  updateGrant: (id, updates) => {
    const index = db.data.grants.findIndex(g => g.id === id);
    if (index === -1) return null;
    db.data.grants[index] = { ...db.data.grants[index], ...updates, updated_at: new Date().toISOString() };
    writeDb();
    return db.data.grants[index];
  },
  
  // Applications
  getApplications: () => db.data.grantApplications,
  getApplicationById: (id) => db.data.grantApplications.find(a => a.id === id),
  addApplication: (application) => {
    application.id = application.id || crypto.randomUUID();
    application.created_at = application.created_at || new Date().toISOString();
    application.updated_at = new Date().toISOString();
    db.data.grantApplications.push(application);
    writeDb();
    return application;
  },
  updateApplication: (id, updates) => {
    const index = db.data.grantApplications.findIndex(a => a.id === id);
    if (index === -1) return null;
    db.data.grantApplications[index] = { ...db.data.grantApplications[index], ...updates, updated_at: new Date().toISOString() };
    writeDb();
    return db.data.grantApplications[index];
  },
  
  // Tasks
  getTasks: () => db.data.grantTasks,
  getTaskById: (id) => db.data.grantTasks.find(t => t.id === id),
  getTasksByApplication: (applicationId) => db.data.grantTasks.filter(t => t.application_id === applicationId),
  addTask: (task) => {
    task.id = task.id || crypto.randomUUID();
    task.created_at = task.created_at || new Date().toISOString();
    db.data.grantTasks.push(task);
    writeDb();
    return task;
  },
  updateTask: (id, updates) => {
    const index = db.data.grantTasks.findIndex(t => t.id === id);
    if (index === -1) return null;
    db.data.grantTasks[index] = { ...db.data.grantTasks[index], ...updates };
    writeDb();
    return db.data.grantTasks[index];
  }
};

export default grantsDb;

