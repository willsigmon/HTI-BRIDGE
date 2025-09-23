export function normalizeIsoDate(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const date = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return trimmed;
}

export function todayIso() {
  return new Date().toISOString().split('T')[0];
}

export function differenceInDays(leftIso, rightIso) {
  const left = toDate(leftIso);
  const right = toDate(rightIso);
  if (!left || !right) return NaN;
  const diffMs = left.getTime() - right.getTime();
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

function toDate(value) {
  if (!value) return null;
  const iso = normalizeIsoDate(value);
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}
