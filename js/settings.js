// Preferencias locales (nivel de la IA y último mazo armado). Nunca se guarda estado de partida:
// una partida nueva siempre empieza desde cero. Todo acceso a localStorage va protegido.
import { validateDeck, EXAMPLE_DECK } from './engine/deck.js';

const KEY = 'capitan-barato.prefs.v1';
const DEFAULTS = { aiLevel: 'normal', deck: null, run: null };

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const obj = JSON.parse(raw);
    return { ...DEFAULTS, ...obj };
  } catch {
    return { ...DEFAULTS };
  }
}

function write(prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* sin almacenamiento: la app funciona igual */
  }
}

let cache = null;
export function getPrefs() {
  if (!cache) cache = read();
  return cache;
}

export function setPrefs(patch) {
  cache = { ...getPrefs(), ...patch };
  write(cache);
  return cache;
}

// Mazo guardado si todavía es válido; si no, el mazo de ejemplo.
export function savedDeckOrExample() {
  const p = getPrefs();
  if (Array.isArray(p.deck) && validateDeck(p.deck).length === 0) return p.deck.slice();
  return EXAMPLE_DECK.slice();
}
