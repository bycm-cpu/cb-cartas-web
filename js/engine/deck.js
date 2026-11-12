// Construcción y validación de mazos (PDF: "Construcción de Mazos").
import { RULES } from '../data/constants.js';
import { t } from '../i18n.js';
import { CARD_BY_NUM } from '../data/cards.js';
import { isLegadoHeroico } from './catalog.js';
import { shuffle } from './rng.js';

// Devuelve una lista de errores en español (vacía si el mazo es válido).
export function validateDeck(nums) {
  const errors = [];
  if (!Array.isArray(nums)) return [t('El mazo no es válido.')];
  if (nums.length !== RULES.deckSize) {
    errors.push(t('El mazo debe tener exactamente {size} cartas de Personaje (tiene {n}).', { size: RULES.deckSize, n: nums.length }));
  }
  const seen = new Set();
  for (const n of nums) {
    if (!CARD_BY_NUM[n]) errors.push(t('La carta N°{n} no está disponible en esta versión.', { n }));
    if (seen.has(n)) errors.push(t('La carta N°{n} está repetida.', { n }));
    seen.add(n);
  }
  const known = nums.filter((n) => CARD_BY_NUM[n]);
  for (const n of known) {
    const d = CARD_BY_NUM[n];
    for (const req of (d.deckRules && d.deckRules.requires) || []) {
      if (!seen.has(req)) {
        const rd = CARD_BY_NUM[req];
        errors.push(t('{name} (N°{n}) necesita incluir a {other} (N°{req}) en el mazo.', { name: d.name, n, other: rd ? rd.name : 'N°' + req, req }));
      }
    }
  }
  const legados = known.filter((n) => isLegadoHeroico(CARD_BY_NUM[n]));
  if (legados.length > 1) {
    errors.push(t('Solo podés tener 1 carta con la habilidad “Legado Heroico” (tenés {n}).', { n: legados.length }));
  }
  return errors;
}

// Mazo de ejemplo válido (usa el orden de la lista, sin azar).
export const EXAMPLE_DECK = [1, 2, 5, 6, 7, 8, 9, 12, 18, 19, 22, 24, 31, 33, 34, 36, 38, 65];

// Arma un mazo válido al azar con el RNG dado (para el rival de la IA o el botón "Al azar").
export function randomValidDeck(rngState, allowed = null) {
  const pool = Object.keys(CARD_BY_NUM).map(Number).filter((n) => !CARD_BY_NUM[n].retired && (!allowed || allowed.includes(n)));
  for (let tries = 0; tries < 500; tries++) {
    const order = shuffle(rngState, pool);
    const deck = [];
    let legado = 0;
    for (const n of order) {
      if (deck.length >= RULES.deckSize) break;
      const d = CARD_BY_NUM[n];
      if (isLegadoHeroico(d)) {
        if (legado >= 1) continue;
        legado++;
      }
      deck.push(n);
    }
    // Resolver vínculos: si falta la contraparte, se agrega (o se descarta la carta).
    let fixed = deck.slice();
    for (const n of deck) {
      for (const req of (CARD_BY_NUM[n].deckRules && CARD_BY_NUM[n].deckRules.requires) || []) {
        if (!fixed.includes(req)) fixed = fixed.filter((x) => x !== n);
      }
    }
    for (const n of order) {
      if (fixed.length >= RULES.deckSize) break;
      const d = CARD_BY_NUM[n];
      if (fixed.includes(n)) continue;
      if (d.deckRules && d.deckRules.requires) continue;
      if (isLegadoHeroico(d) && fixed.some((x) => isLegadoHeroico(CARD_BY_NUM[x]))) continue;
      fixed.push(n);
    }
    if (validateDeck(fixed).length === 0) return fixed;
  }
  return EXAMPLE_DECK.slice();
}
