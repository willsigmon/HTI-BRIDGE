import { STORAGE_KEY, THEME_KEY, PERSONA_BUCKETS } from '../config.js';
import { escapeHtml, assignPersonaMetadata, createToast } from './utils.js';

// Global event handlers and UI setup

export function bindGlobalHandlers(filters, renderLeadsTable, handleBackdropClick, handleEscapeKey, handleStorageSync) {
  document.addEventListener('click', handleBackdropClick);
  document.addEventListener('keydown', handleEscapeKey);
  window.addEventListener('storage', handleStorageSync);
  const searchInput = document.getElementById('searchFilter');
  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      filters.search = event.target.value.trim().toLowerCase();
      renderLeadsTable();
    });
  }
}

export function setupTabNavigation(renderMapView, renderDataHub, renderAutomationStudio, renderOperationsConsole) {
  const tabButtons = document.querySelectorAll('.nav__tab');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const targetTabId = button.getAttribute('data-tab');
      tabButtons.forEach((btn) => {
        btn.classList.toggle('nav__tab--active', btn === button);
        btn.setAttribute('aria-selected', btn === button ? 'true' : 'false');
      });
      tabContents.forEach((content) => {
        content.classList.toggle('tab-content--active', content.id === targetTabId);
      });
      if (targetTabId === 'map') {
        setTimeout(renderMapView, 100);
      }
      if (targetTabId === 'dataHub') {
        renderDataHub();
      }
      if (targetTabId === 'automation') {
        renderAutomationStudio();
      }
      if (targetTabId === 'admin') {
        renderOperationsConsole();
      }
    });
  });
}

export function setupNavOverflow() {
  const toggle = document.getElementById('navMoreToggle');
  const menu = document.getElementById('navOverflowMenu');
  if (!toggle || !menu) return;

  const closeMenu = () => {
    toggle.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
  };

  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    menu.hidden = expanded;
  });

  menu.addEventListener('click', (event) => {
    const button = event.target.closest('.nav__tab');
    if (button) {
      closeMenu();
    }
  });

  document.addEventListener('click', (event) => {
    if (event.target === toggle || menu.contains(event.target)) return;
    closeMenu();
  });
}

export function setupFilters(filters, renderLeadsTable) {
  const statusFilter = document.getElementById('statusFilter');
  const sourceFilter = document.getElementById('sourceFilter');
  const priorityFilter = document.getElementById('priorityFilter');
  const sortFilter = document.getElementById('sortFilter');

  if (statusFilter) {
    statusFilter.addEventListener('change', (event) => {
      filters.status = event.target.value;
      renderLeadsTable();
    });
  }

  if (sourceFilter) {
    sourceFilter.addEventListener('change', (event) => {
      filters.source = event.target.value;
      renderLeadsTable();
    });
  }

  if (priorityFilter) {
    priorityFilter.addEventListener('change', (event) => {
      filters.priority = event.target.value;
      renderLeadsTable();
    });
  }

  const personaFilter = document.getElementById('personaFilter');
  if (personaFilter) {
    personaFilter.addEventListener('change', (event) => {
      filters.persona = event.target.value;
      renderLeadsTable();
    });
  }

  if (sortFilter) {
    sortFilter.addEventListener('change', (event) => {
      filters.sort = event.target.value;
      renderLeadsTable();
    });
  }
}

export function populatePersonaFilter(state, filters) {
  const personaFilter = document.getElementById('personaFilter');
  if (!personaFilter) return;

  const personas = new Set(PERSONA_BUCKETS);
  (state.leads || []).forEach((lead) => {
    if (!lead.persona) assignPersonaMetadata(lead);
    if (lead.persona) personas.add(lead.persona);
  });

  const personaOptions = Array.from(personas)
    .filter((persona) => state.settings?.personas?.enabled?.[persona] !== false)
    .sort((a, b) => a.localeCompare(b));
  const previousValue = filters.persona;

  personaFilter.innerHTML = [
    '<option value="">All Personas</option>',
    ...personaOptions.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`)
  ].join('');

  if (previousValue && personaOptions.includes(previousValue)) {
    personaFilter.value = previousValue;
  } else {
    personaFilter.value = '';
    if (previousValue) {
      filters.persona = '';
    }
  }
}

export function setupCorporateFilters(filters, renderCorporateTargets) {
  const filterButtons = document.querySelectorAll('[data-corporate-filter]');
  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      filterButtons.forEach((btn) => btn.classList.remove('chip--active'));
      button.classList.add('chip--active');
      filters.corporatePriority = button.getAttribute('data-corporate-filter');
      renderCorporateTargets();
    });
  });
}

export function setupDataHubControls(uiState, renderDataHub, apiAvailable, refreshDedupes, refreshInteractions) {
  const search = document.getElementById('dataHubSearch');
  if (search) {
    search.addEventListener('input', (event) => {
      uiState.entityQuery = event.target.value.trim().toLowerCase();
      renderDataHub();
    });
  }

  if (apiAvailable) {
    refreshDedupes();
    refreshInteractions(200);
  }
}

export function setupAutomationControls(handleAutomationSubmit, apiAvailable, refreshAutomations, refreshTasks) {
  const form = document.getElementById('automationForm');
  if (form) {
    form.addEventListener('submit', handleAutomationSubmit);
  }

  if (apiAvailable) {
    refreshAutomations();
    refreshTasks();
  }
}

export function setupOperationsConsoleControls(submitConnectorForm, submitApiKeyForm, apiAvailable, refreshOperationsConsole, renderOperationsConsole) {
  const connectorForm = document.getElementById('connectorForm');
  if (connectorForm) {
    connectorForm.addEventListener('submit', (event) => {
      event.preventDefault();
      submitConnectorForm();
    });
  }

  const apiKeyForm = document.getElementById('apiKeyForm');
  if (apiKeyForm) {
    apiKeyForm.addEventListener('submit', (event) => {
      event.preventDefault();
      submitApiKeyForm();
    });
  }

  if (apiAvailable) {
    refreshOperationsConsole();
  } else {
    renderOperationsConsole();
  }
}

export function setupSettingsControls() {
  const personaForm = document.getElementById('personaSettingsForm');
  if (personaForm) {
    personaForm.addEventListener('submit', (event) => event.preventDefault());
  }
  const preferencesForm = document.getElementById('preferencesForm');
  if (preferencesForm) {
    preferencesForm.addEventListener('submit', (event) => event.preventDefault());
  }
  const apiBaseForm = document.getElementById('apiBaseForm');
  if (apiBaseForm) {
    apiBaseForm.addEventListener('submit', (event) => event.preventDefault());
  }
  const authSettingsForm = document.getElementById('authSettingsForm');
  if (authSettingsForm) {
    authSettingsForm.addEventListener('submit', (event) => event.preventDefault());
  }
}

export function setupThemeToggle() {
  const button = document.getElementById('themeToggle');
  if (!button) return;

  const savedTheme = getSavedTheme();
  applyTheme(savedTheme);
  updateThemeToggleLabel(button, savedTheme);

  button.addEventListener('click', () => {
    const currentTheme = getSavedTheme();
    const nextTheme = cycleTheme(currentTheme);
    saveTheme(nextTheme);
    applyTheme(nextTheme);
    updateThemeToggleLabel(button, nextTheme);
    createToast('Theme updated', `Switched to ${nextTheme} mode.`, 'info');
  });
}

export function applyTheme(theme) {
  const root = document.documentElement;
  const app = document.querySelector('.app');
  const resolvedTheme = theme || 'auto';
  if (app) {
    app.setAttribute('data-color-scheme', resolvedTheme);
  }
  root.setAttribute('data-color-scheme', resolvedTheme);
}

export function getSavedTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || 'auto';
  } catch (error) {
    console.warn('Theme storage unavailable', error);
    return 'auto';
  }
}

export function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (error) {
    console.warn('Unable to persist theme preference', error);
  }
}

export function cycleTheme(theme) {
  const modes = ['light', 'dark', 'auto'];
  const currentIndex = modes.indexOf(theme);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % modes.length;
  return modes[nextIndex];
}

export function updateThemeToggleLabel(button, theme) {
  const iconMap = { light: '☀️', dark: '🌙', auto: '🌓' };
  const labelMap = { light: 'Light', dark: 'Dark', auto: 'Auto' };
  const icon = button.querySelector('.theme-toggle__icon');
  const text = button.querySelector('.theme-toggle__label');
  if (icon) icon.textContent = iconMap[theme] || '🌓';
  if (text) text.textContent = `${labelMap[theme] || 'Auto'} theme`;
}

export function getInputValue(id) {
  const input = document.getElementById(id);
  return input ? input.value.trim() : '';
}

export function setInputValue(id, value) {
  const input = document.getElementById(id);
  if (input !== null && input !== undefined) {
    input.value = value ?? '';
  }
}

export function switchToTab(tabId) {
  const button = document.querySelector(`.nav__tab[data-tab="${tabId}"]`);
  if (button) button.click();
}
