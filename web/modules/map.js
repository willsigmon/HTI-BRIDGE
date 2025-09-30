import {
  escapeHtml,
  escapeQuotes,
  formatDate,
  formatNumber,
  deriveMapPointsFromLeads
} from './utils.js';
import { apiRequest } from './api.js';

/**
 * Map Module
 * Handles map visualization functionality including:
 * - Leaflet map rendering
 * - Lead location plotting
 * - Route planning
 * - Map data refresh
 */

// ============================================================================
// Map Rendering
// ============================================================================

export function renderMapView(state, apiAvailable, mapInstance, mapMarkers, mapReady, refreshMap) {
  const mapContainer = document.getElementById('mapView');
  const summaryEl = document.getElementById('mapSummary');
  const routesEl = document.getElementById('routeList');
  if (!mapContainer || !summaryEl || !routesEl) return;

  if (state.settings?.preferences?.enableMap === false) {
    mapContainer.innerHTML = '<div class="empty-state"><p>Map is disabled in settings.</p></div>';
    summaryEl.innerHTML = '';
    routesEl.innerHTML = '<div class="empty-state"><p>Enable the map in Settings to view routes.</p></div>';
    return;
  }

  const points = (state.mapPoints && state.mapPoints.length ? state.mapPoints : deriveMapPointsFromLeads(state.leads)).slice(0, 250);

  if (!mapInstance.instance) {
    mapInstance.instance = L.map(mapContainer).setView([35.7796, -78.6382], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(mapInstance.instance);
    mapReady.value = true;
  } else {
    mapInstance.instance.invalidateSize();
  }

  mapMarkers.markers.forEach((marker) => marker.remove());
  mapMarkers.markers = points.map((point) => {
    const marker = L.circleMarker([point.lat, point.lng], {
      radius: Math.max(6, Math.min(14, (point.estimatedQuantity || 10) / 20)),
      fillColor: '#0f766e',
      color: '#0f4c5c',
      weight: 1,
      fillOpacity: 0.75
    }).addTo(mapInstance.instance);
    marker.bindPopup(`
      <strong>${escapeHtml(point.title || point.company || 'Lead')}</strong><br>
      ${escapeHtml(point.company || 'Unknown')}<br>
      ${escapeHtml(point.location || 'Location pending')}<br>
      ${point.persona ? `Persona: ${escapeHtml(point.persona)}<br>` : ''}
      Qty: ${formatNumber(point.estimatedQuantity || 0)}
    `);
    return marker;
  });

  if (points.length) {
    const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng]));
    mapInstance.instance.fitBounds(bounds, { padding: [40, 40] });
  }

  const totalDevices = points.reduce((sum, point) => sum + (Number(point.estimatedQuantity) || 0), 0);
  const highPriority = points.filter((point) => (point.priority || 0) >= 80).length;
  summaryEl.innerHTML = `
    <div class="detail-item">
      <span class="detail-label">Stops</span>
      <span class="detail-value">${formatNumber(points.length)}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Projected Devices</span>
      <span class="detail-value">${formatNumber(totalDevices)}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">High Priority</span>
      <span class="detail-value">${formatNumber(highPriority)}</span>
    </div>
  `;

  const upcoming = points
    .filter((point) => point.followUpDate)
    .sort((a, b) => new Date(a.followUpDate) - new Date(b.followUpDate))
    .slice(0, 6);

  routesEl.innerHTML = upcoming.length
    ? upcoming
        .map((point) => `
            <div class="route-card">
              <div class="detail-label">${formatDate(point.followUpDate)}</div>
              <div class="detail-value">${escapeHtml(point.company || point.title || 'Lead')}</div>
              <div class="detail-value">${escapeHtml(point.location || 'Location pending')}</div>
              <button class="btn btn--outline btn-sm" type="button" onclick="viewLead('${escapeQuotes(point.id)}')">Open Lead</button>
            </div>
          `)
        .join('')
    : '<div class="empty-state"><p>No scheduled routes this week.</p></div>';

  if (apiAvailable.value && !state.mapPoints?.length) {
    refreshMap();
  }
}

// ============================================================================
// Map Data Refresh
// ============================================================================

export async function refreshMap(state, apiAvailable, renderMapViewFn) {
  if (!apiAvailable.value) return;
  try {
    const response = await apiRequest('/maps/leads', { method: 'GET' });
    const payload = await response.json();
    state.mapPoints = Array.isArray(payload) ? payload : payload.points || [];
    renderMapViewFn();
  } catch (error) {
    console.warn('Unable to refresh map', error);
  }
}
