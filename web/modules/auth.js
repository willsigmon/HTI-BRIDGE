import { AUTH_PROMPT_MESSAGE, DEFAULT_AUTH_URL, INITIAL_AUTH_URL } from '../config.js';
import { createToast } from './utils.js';

// Auth-related UI state (will be imported by main.js and passed in)
// This module manages authentication state and UI

// Render the authentication banner
export function renderAuthBanner(uiState) {
  const banner = document.getElementById('authBanner');
  if (!banner) return;

  const titleEl = document.getElementById('authBannerTitle');
  const messageEl = document.getElementById('authBannerMessage');
  const statusEl = document.getElementById('authBannerStatus');

  if (uiState.authRequired) {
    banner.classList.remove('hidden');
    if (titleEl) {
      titleEl.textContent = 'Sign in required';
    }
    if (messageEl) {
      messageEl.textContent = uiState.authMessage || AUTH_PROMPT_MESSAGE;
    }
    if (statusEl) {
      if (uiState.authStatus) {
        statusEl.textContent = `API response: ${uiState.authStatus}`;
        statusEl.style.display = '';
      } else {
        statusEl.textContent = '';
        statusEl.style.display = 'none';
      }
    }
  } else {
    banner.classList.add('hidden');
    if (statusEl) {
      statusEl.textContent = '';
      statusEl.style.display = 'none';
    }
  }
}

// Show a toast notification about auth requirement (rate-limited)
export function notifyAuthRequired(message, uiState) {
  const now = Date.now();
  if (now - (uiState.authToastAt || 0) < 60000) {
    return;
  }
  createToast('Sign-in required', message, 'warning', 5000);
  uiState.authToastAt = now;
}

// Check if error is auth-related and handle it
export function handleAuthError(error, message, uiState) {
  // Need to check against ApiError - will be checked at runtime
  if (!(error instanceof Error) || !isAuthStatus(error.status)) {
    return false;
  }
  const details = typeof error.details === 'object' && error.details !== null ? error.details : {};
  flagAuthRequired({
    message: message || error.message,
    status: error.status,
    authUrl: details.authUrl || details.signInUrl || details.loginUrl,
    forceMessage: true
  }, uiState);
  return true;
}

// Flag that authentication is required
export function flagAuthRequired({ message, status, authUrl, forceMessage = false }, uiState) {
  if (typeof status === 'number') {
    uiState.authStatus = status;
  }
  if (authUrl && typeof authUrl === 'string') {
    updateStoredAuthUrl(authUrl);
    uiState.authTarget = authUrl;
  } else if (!uiState.authTarget) {
    uiState.authTarget = window.__HTI_AUTH_URL__ || INITIAL_AUTH_URL || DEFAULT_AUTH_URL;
  }
  if (forceMessage || !uiState.authMessage) {
    uiState.authMessage = message || AUTH_PROMPT_MESSAGE;
  }
  uiState.authRequired = true;
  renderAuthBanner(uiState);
  return true;
}

// Clear auth state
export function clearAuthState(uiState) {
  if (!uiState.authRequired && !uiState.authStatus && !uiState.authMessage) {
    return;
  }
  uiState.authRequired = false;
  uiState.authStatus = null;
  uiState.authMessage = '';
  uiState.authToastAt = 0;
  renderAuthBanner(uiState);
}

// Dismiss the auth banner
export function dismissAuthBanner(uiState) {
  uiState.authRequired = false;
  uiState.authStatus = null;
  uiState.authMessage = '';
  uiState.authToastAt = 0;
  renderAuthBanner(uiState);
}

// Start the authentication flow
export function startAuthFlow(uiState, switchToTab) {
  const target = uiState.authTarget || window.__HTI_AUTH_URL__ || INITIAL_AUTH_URL || DEFAULT_AUTH_URL;
  if (!target) {
    createToast('Configure sign-in', 'Set a login URL under Settings > Authentication.', 'info');
    switchToTab('settings');
    return;
  }
  try {
    window.open(target, '_blank', 'noopener');
  } catch (error) {
    window.location.href = target;
  }
}

// Update stored auth URL in localStorage
export function updateStoredAuthUrl(value) {
  if (!value || typeof value !== 'string') return;
  try {
    const key = 'hti-crm-auth-url';
    const existing = localStorage.getItem(key);
    if (existing !== value) {
      localStorage.setItem(key, value);
      window.__HTI_AUTH_URL__ = value;
    }
  } catch (error) {
    console.warn('Unable to persist auth URL', error);
  }
}

// Check if HTTP status indicates auth error
function isAuthStatus(status) {
  return status === 401 || status === 403;
}
