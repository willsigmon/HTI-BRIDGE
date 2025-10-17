/**
 * Enhanced Authentication Middleware for HTI-BRIDGE CRM
 * Provides JWT-based authentication, password hashing, and session management
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getUserById, getUserByEmail, createUser, updateUserLastLogin } from '../repositories/security.js';

const JWT_SECRET = process.env.JWT_SECRET || 'hti-bridge-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare a password with a hash
 */
export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      workspaceId: user.workspaceId
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verify a JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Extract token from request (Bearer token or cookie)
 */
function extractToken(req) {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check cookie
  if (req.cookies && req.cookies.hti_token) {
    return req.cookies.hti_token;
  }
  
  return null;
}

/**
 * Enhanced authentication middleware with JWT support
 */
export function authenticateUser(req, res, next) {
  // Try JWT authentication first
  const token = extractToken(req);
  
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      const user = getUserById(decoded.id);
      if (user) {
        req.user = user;
        req.workspaceId = user.workspaceId;
        updateUserLastLogin(user.id);
        return next();
      }
    }
  }
  
  // Fall back to header-based auth for backwards compatibility
  const headerUserId = req.header('x-user-id') || req.header('x-hti-user');
  if (headerUserId) {
    const user = getUserById(headerUserId);
    if (user) {
      req.user = user;
      req.workspaceId = user.workspaceId;
      return next();
    }
  }
  
  // Check if auth is required
  const requireAuth = process.env.HTI_REQUIRE_AUTH === 'true';
  
  if (!requireAuth) {
    // Use default user for demo mode
    const defaultUserId = process.env.HTI_DEFAULT_USER_ID || 'hti-admin';
    const defaultUser = getUserById(defaultUserId);
    if (defaultUser) {
      req.user = defaultUser;
      req.workspaceId = defaultUser.workspaceId;
      return next();
    }
  }
  
  // No valid authentication found
  const authUrl = process.env.HTI_AUTH_URL || '/login';
  return res.status(401).json({
    error: 'authentication-required',
    message: 'Please sign in to access the HTI CRM.',
    authUrl
  });
}

/**
 * Optional authentication - doesn't block if no auth provided
 */
export function optionalAuth(req, res, next) {
  const token = extractToken(req);
  
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      const user = getUserById(decoded.id);
      if (user) {
        req.user = user;
        req.workspaceId = user.workspaceId;
      }
    }
  }
  
  next();
}

/**
 * Require specific role
 */
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'authentication-required' });
    }
    
    if (req.user.role !== role && req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'forbidden',
        message: `This action requires ${role} role.`
      });
    }
    
    next();
  };
}

/**
 * Require any of the specified roles
 */
export function requireAnyRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'authentication-required' });
    }
    
    if (!roles.includes(req.user.role) && req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'forbidden',
        message: `This action requires one of: ${roles.join(', ')}`
      });
    }
    
    next();
  };
}

