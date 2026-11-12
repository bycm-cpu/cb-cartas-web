// Íconos de atributos (SVG propios, 24x24). Se colorean desde CSS.
const P = {
  fue: '<path d="M6.2 10.2c0-1.1.9-2 2-2h.4A2.1 2.1 0 0 1 10.7 7a2.1 2.1 0 0 1 1.9 1.1 2.1 2.1 0 0 1 2.4.5 2 2 0 0 1 2.4 1.9v4.3c0 2.6-2.1 4.7-4.7 4.7h-.9c-3 0-5.6-2.3-5.6-5.2v-3.1z"/><path class="ln" d="M10.7 9.2v3M13 9.6v2.8M15.1 10.4v2.2" fill="none"/>',
  int: '<path d="M9.2 4.6A3.2 3.2 0 0 0 6 7.8c0 .2 0 .4.1.6A3.2 3.2 0 0 0 5 11a3.2 3.2 0 0 0 1.3 2.5A3.2 3.2 0 0 0 9 18.4a3.2 3.2 0 0 0 3 .9V6.2a2.6 2.6 0 0 0-2.8-1.6zm5.6 0A3.2 3.2 0 0 1 18 7.8c0 .2 0 .4-.1.6A3.2 3.2 0 0 1 19 11a3.2 3.2 0 0 1-1.3 2.5 3.2 3.2 0 0 1-2.7 4.9 3.2 3.2 0 0 1-3 .9V6.2a2.6 2.6 0 0 1 2.8-1.6z"/>',
  vel: '<path d="M13.4 2 5.2 13.4h5.2L9.2 22l9.1-12h-5.4z"/>',
  res: '<path d="M12 2.4 4.6 5.4v6.1c0 4.6 3 8.3 7.4 10 4.4-1.7 7.4-5.4 7.4-10V5.4z"/><path class="ln" d="M12 6v12" fill="none"/>',
  agi: '<path d="M2.8 17.2c4 .6 6.6-.7 8.1-3.6 1.2-2.5 3-4.5 6.2-5.6-1.1 2.3-.6 3.7.4 4.6-1.4.8-2.9 2.4-3.4 4.4 3.1 0 5.2-1.1 7.1-3.1-.5 3.6-3.6 6.7-8.7 6.7-3.9 0-7.3-1-9.2-3.4z"/>',
  car: '<path d="m12 2.6 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5l-5.9 3.1 1.2-6.5L2.5 9.5l6.6-.9z"/>',
};

export function attrIcon(attr) {
  return `<svg class="ico ico-${attr}" viewBox="0 0 24 24" aria-hidden="true">${P[attr]}</svg>`;
}

export const ICON = {
  back: '<svg viewBox="0 0 24 24" class="ico"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  log: '<svg viewBox="0 0 24 24" class="ico"><path d="M5 5h14M5 10h14M5 15h10M5 20h7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
  zoom: '<svg viewBox="0 0 24 24" class="ico"><circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M15 15l5.5 5.5" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
  close: '<svg viewBox="0 0 24 24" class="ico"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
  link: '<svg viewBox="0 0 24 24" class="ico"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  deck: '<svg viewBox="0 0 24 24" class="ico"><rect x="7" y="3" width="12" height="16" rx="2" fill="currentColor"/><path d="M4 7v12a2 2 0 0 0 2 2h9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  discard: '<svg viewBox="0 0 24 24" class="ico"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  decks: '<svg viewBox="0 0 24 24" class="ico"><rect x="3" y="6" width="10" height="14" rx="2" fill="currentColor" transform="rotate(-10 8 13)"/><rect x="11" y="4" width="10" height="14" rx="2" fill="currentColor" opacity=".7" transform="rotate(10 16 11)"/></svg>',
  star: '<svg viewBox="0 0 24 24" class="ico"><path d="m12 2.6 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5l-5.9 3.1 1.2-6.5L2.5 9.5l6.6-.9z" fill="currentColor"/></svg>',
};
