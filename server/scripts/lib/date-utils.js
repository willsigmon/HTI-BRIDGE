export function startOfNextMonth(base = new Date()) {
  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();
  const next = new Date(Date.UTC(year, month + 1, 1));
  return next.toISOString().split('T')[0];
}
