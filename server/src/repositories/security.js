import crypto from 'node:crypto';
import { db, writeDb } from '../db.js';
import { logAuditEvent } from './audit.js';

const ROLE_PERMISSIONS = {
  owner: ['*'],
  admin: [
    'leads:read',
    'leads:write',
    'leads:assign',
    'contacts:read',
    'contacts:write',
    'pipelines:read',
    'pipelines:manage',
    'automations:read',
    'automations:manage',
    'analytics:view',
    'ingestion:manage',
    'security:manage',
    'forms:manage',
    'connectors:manage'
  ],
  manager: [
    'leads:read',
    'leads:write',
    'leads:assign',
    'contacts:read',
    'contacts:write',
    'pipelines:read',
    'automations:read',
    'analytics:view',
    'ingestion:read',
    'forms:read',
    'connectors:manage'
  ],
  contributor: [
    'leads:read',
    'leads:write',
    'contacts:read',
    'pipelines:read',
    'analytics:view'
  ],
  viewer: [
    'leads:read',
    'contacts:read',
    'pipelines:read',
    'analytics:view'
  ]
};

function getUsers() {
  return db.data.users;
}

function getWorkspaces() {
  return db.data.workspaces;
}

function getApiKeys() {
  return db.data.apiKeys;
}

export function bootstrapSecurity() {
  if (!getWorkspaces().length) {
    const primaryWorkspaceId = crypto.randomUUID();
    getWorkspaces().push({
      id: primaryWorkspaceId,
      name: 'HTI Core',
      timezone: 'America/New_York',
      createdAt: new Date().toISOString()
    });
  }

  if (!getUsers().length) {
    const workspaceId = getWorkspaces()[0].id;
    const now = new Date().toISOString();
    getUsers().push(
      {
        id: 'hti-admin',
        name: 'HTI Admin',
        email: 'admin@hubzonetech.org',
        role: 'owner',
        workspaceId,
        team: 'Executive',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'hti-outreach',
        name: 'Outreach Lead',
        email: 'outreach@hubzonetech.org',
        role: 'manager',
        workspaceId,
        team: 'Business Development',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'hti-fellow',
        name: 'HUBZone Fellow',
        email: 'fellow@hubzonetech.org',
        role: 'contributor',
        workspaceId,
        team: 'Field Operations',
        createdAt: now,
        updatedAt: now
      }
    );
  }

  writeDb();
}

export function listUsers() {
  return [...getUsers()];
}

export function listWorkspaces() {
  return [...getWorkspaces()];
}

export function getUserById(id) {
  return getUsers().find((user) => user.id === id) || null;
}

export function authorizeUser(user, permission) {
  if (!user) return false;
  const permissions = ROLE_PERMISSIONS[user.role] || [];
  if (permissions.includes('*')) return true;
  if (permissions.includes(permission)) return true;
  const [resource, action] = permission.split(':');
  if (action === 'read' && permissions.includes(`${resource}:manage`)) {
    return true;
  }
  if (action === 'write' && permissions.includes(`${resource}:manage`)) {
    return true;
  }
  return false;
}

export function createApiKey({
  name,
  scopes = [],
  allowedOrigins = [],
  expiresAt,
  actorId = 'system',
  workspaceId
}) {
  const apiKeys = getApiKeys();
  const rawKey = generateRawKey();
  const now = new Date().toISOString();
  const record = {
    id: crypto.randomUUID(),
    name,
    prefix: rawKey.slice(0, 8),
    hashedKey: hashKey(rawKey),
    scopes,
    allowedOrigins,
    expiresAt: expiresAt || null,
    workspaceId,
    createdBy: actorId,
    createdAt: now,
    updatedAt: now
  };
  apiKeys.push(record);
  writeDb();
  logAuditEvent({
    actorId,
    action: 'apiKey.created',
    entityType: 'security',
    entityId: record.id,
    after: { name, scopes }
  });
  return { ...record, secret: rawKey };
}

export function revokeApiKey(id, actorId = 'system') {
  const apiKeys = getApiKeys();
  const index = apiKeys.findIndex((key) => key.id === id);
  if (index === -1) return false;
  const [removed] = apiKeys.splice(index, 1);
  writeDb();
  logAuditEvent({
    actorId,
    action: 'apiKey.revoked',
    entityType: 'security',
    entityId: removed.id,
    before: { name: removed.name }
  });
  return true;
}

export function listApiKeys({ workspaceId } = {}) {
  let keys = [...getApiKeys()];
  if (workspaceId) {
    keys = keys.filter((key) => key.workspaceId === workspaceId);
  }
  return keys.map(({ hashedKey, ...rest }) => rest);
}

export function findApiKeyBySecret(secret) {
  if (!secret) return null;
  const hashed = hashKey(secret);
  const apiKeys = getApiKeys();
  return apiKeys.find((key) => key.hashedKey === hashed) || null;
}

function generateRawKey() {
  const random = crypto.randomBytes(28).toString('base64url');
  return `hti_${random}`;
}

function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}
