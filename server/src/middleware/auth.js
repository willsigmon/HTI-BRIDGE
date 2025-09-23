import { getUserById, authorizeUser, findApiKeyBySecret, bootstrapSecurity, listWorkspaces } from '../repositories/security.js';

bootstrapSecurity();

export function attachUser(req, res, next) {
  const headerUserId = req.header('x-user-id') || req.header('x-hti-user');
  const workspaceHeader = req.header('x-workspace-id') || null;
  const defaultUserId = process.env.HTI_DEFAULT_USER_ID || 'hti-admin';
  const requireAuth = process.env.HTI_REQUIRE_AUTH === 'true';

  let resolvedUser = headerUserId ? getUserById(headerUserId) : null;
  if (!resolvedUser && !requireAuth) {
    resolvedUser = getUserById(defaultUserId);
  }

  if (!resolvedUser) {
    const authUrl = process.env.HTI_AUTH_URL || null;
    res.status(401).json({
      error: 'signin-required',
      message: 'Sign in to access the HTI API.',
      authUrl
    });
    return;
  }

  req.user = resolvedUser;
  req.workspaceId = workspaceHeader || resolvedUser.workspaceId || listWorkspaces()[0]?.id || null;
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
