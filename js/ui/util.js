// Utilidades mínimas de DOM/HTML. Todo texto proveniente de datos se escapa.
export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function signed(n) {
  return n > 0 ? `+${n}` : `${n}`;
}

export function pad3(n) {
  return String(n).padStart(3, '0');
}

export function reducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
