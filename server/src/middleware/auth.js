import { getUserById, authorizeUser, findApiKeyBySecret, bootstrapSecurity, listWorkspaces } from '../repositories/security.js';

bootstrapSecurity();

export function attachUser(req, res, next) {
  const headerUserId = req.header('x-user-id') || req.header('x-hti-user');
  const workspaceId = req.header('x-workspace-id') || null;
  const defaultUserId = 'hti-admin';
  const user = getUserById(headerUserId || defaultUserId);
  req.user = user || getUserById(defaultUserId);
  req.workspaceId = workspaceId || req.user?.workspaceId || listWorkspaces()[0]?.id || null;
  next();
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!authorizeUser(req.user, permission)) {
      res.status(403).json({ error: 'forbidden', message: `Missing permission: ${permission}` });
      return;
    }
    next();
  };
}

export function authenticateApiKey(req) {
  const apiKey = req.header('x-api-key') || req.query.apiKey;
  if (!apiKey) return null;
  const record = findApiKeyBySecret(apiKey);
  if (!record) return null;
  return record;
}
