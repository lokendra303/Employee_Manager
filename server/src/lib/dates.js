export function toDateOnly(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function formatDateOnly(date) {
  return toDateOnly(date).toISOString().slice(0, 10);
}

export function addDays(date, days) {
  const d = toDateOnly(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function daysBetween(start, end) {
  const ms = toDateOnly(end).getTime() - toDateOnly(start).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}
