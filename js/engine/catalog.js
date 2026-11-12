// Acceso al catálogo de cartas y escenarios (datos), con utilidades de clase.
import { CARD_BY_NUM, CARDS, GHOST_NUM, GHOST_DEF } from '../data/cards.js';
import { SCENARIOS, SCENARIO_BY_ID } from '../data/scenarios.js';
import { normalizeClass, ATTRS } from '../data/constants.js';

export function cardDef(num) {
  if (num === GHOST_NUM) return GHOST_DEF;
  const d = CARD_BY_NUM[num];
  if (!d) throw new Error(`Carta desconocida: N°${num}`);
  return d;
}

export function scenarioDef(id) {
  const d = SCENARIO_BY_ID[id];
  if (!d) throw new Error(`Escenario desconocido: ${id}`);
  return d;
}

export function allImplementedCards() {
  return CARDS.slice();
}

export function allScenarioIds() {
  return SCENARIOS.map((s) => s.id);
}

export function classKeys(def) {
  return (def.classes || []).map(normalizeClass);
}

export function hasAnyClass(classes, wanted) {
  const set = new Set(classes);
  return wanted.some((w) => set.has(normalizeClass(w)));
}

export function totalStats(def) {
  return ATTRS.reduce((s, a) => s + def.stats[a], 0);
}

export function isLegadoHeroico(def) {
  return !!(def.deckRules && def.deckRules.legadoHeroico);
}
