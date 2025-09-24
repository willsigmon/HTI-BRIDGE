import {
  STATUS_CONFIG,
  PERSONA_CONFIG,
  DEFAULT_USER_DIRECTORY,
  UPCOMING_THRESHOLD_DAYS
} from '../shared/config/statusPersonas.js';

export const STORAGE_KEY = 'hti-crm-state-v1';
export const THEME_KEY = 'hti-crm-theme';
export const DEVICE_GOAL = 2000;
export const DEFAULT_AUTH_URL = '/auth/login';
export const API_BASE_URL = window.__HTI_API_BASE__ || '/api';
export const INITIAL_AUTH_URL = window.__HTI_AUTH_URL__ || DEFAULT_AUTH_URL;
export const AUTH_PROMPT_MESSAGE =
  'Sign in with your HTI credentials to sync live data from the API.';
export const API_TIMEOUT_MS = 8000;
export const UPCOMING_THRESHOLD = UPCOMING_THRESHOLD_DAYS;

export const ACTIVE_STATUSES = new Set(STATUS_CONFIG.active);
export const CLOSED_STATUSES = new Set(STATUS_CONFIG.closed);
export const CORPORATE_PRIORITY_RANK = { ...STATUS_CONFIG.corporatePriorityRank };

export const PERSONA_BUCKETS = [...PERSONA_CONFIG.buckets];
export const PERSONA_TAG_DEFINITIONS = { ...PERSONA_CONFIG.tagDefinitions };
export const PERSONA_OWNER_MAP = { ...PERSONA_CONFIG.ownerMap };
export const DEFAULT_PERSONA = PERSONA_CONFIG.defaultPersona;
export const LOGISTICS_PERSONA = PERSONA_CONFIG.logisticsPersona;
export const USER_DIRECTORY = { ...DEFAULT_USER_DIRECTORY };

export const FEATURE_FLAGS = {
  enableMap: true
};
