// Catálogo de condiciones, contadores y tipos de efecto de las habilidades.
// Las cartas (data/cards.js) sólo referencian estos nombres: no hay lógica de personajes en la UI.
//
// Contexto de evaluación (cx):
//   cx.state      estado de la partida
//   cx.side       lado dueño del efecto ('p1' | 'p2')
//   cx.foe        lado rival
//   cx.defs       { p1: definición de carta jugada, p2: ... }
//   cx.entries    entradas de modificación ya generadas (capa 1) — sólo para condiciones de capa 2
import { ATTRS } from '../data/constants.js';
import { td } from '../i18n.js';
import { cardDef, classKeys, hasAnyClass, isLegadoHeroico } from './catalog.js';

export const other = (side) => (side === 'p1' ? 'p2' : 'p1');

// Clases efectivas de la carta jugada (el escenario Lanín las anula durante el Round).
export function effectiveClasses(cx, side) {
  if (cx.state.scenarioFlags && cx.state.scenarioFlags.noClasses) return [];
  return classKeys(cx.defs[side]);
}

export const COUNTERS = {
  roundsPlayed: (cx) => cx.state.roundsCompleted,
  duelsFinished: (cx) => cx.state.duelsFinished,
  duelsLost: (cx) => cx.state.players[cx.side].duelsLost,
  foeDiscard: (cx) => cx.state.players[cx.foe].discard.length,
};

export const CONDITIONS = {
  firstDuelOfGame: (cx) => cx.state.duelsFinished === 0,
  firstCardOfRound: (cx) => cx.state.players[cx.side].playedThisRound === 0,
  roundIs: (cx, c) => cx.state.round === c.n,
  prevDuelWon: (cx) => {
    const h = cx.state.players[cx.side].history;
    return h.length > 0 && h[h.length - 1].won === true;
  },
  prevDuelLost: (cx) => {
    const h = cx.state.players[cx.side].history;
    return h.length > 0 && h[h.length - 1].won === false;
  },
  // Verdadero si no hubo duelo previo o si el atributo del duelo anterior fue distinto.
  prevAttrNot: (cx, c) => cx.state.lastDuelAttr !== c.attr,
  foeClassIn: (cx, c) => hasAnyClass(effectiveClasses(cx, cx.foe), c.classes),
  selfClassIn: (cx, c) => hasAnyClass(effectiveClasses(cx, cx.side), c.classes),
  // Se comparan los valores impresos (ver docs/PENDIENTES.md, R-06).
  foeStatLowerThanSelf: (cx, c) => cx.defs[cx.foe].stats[c.attr] < cx.defs[cx.side].stats[c.attr],
  selfStatHigherThanFoe: (cx, c) => cx.defs[cx.side].stats[c.attr] > cx.defs[cx.foe].stats[c.attr],
  noLegadoHeroicoInDeck: (cx) =>
    !cx.state.players[cx.side].deckNums.some((n) => isLegadoHeroico(cardDef(n))),
  inOwnDiscard: (cx, c) =>
    cx.state.players[cx.side].discard.some((uid) => cx.state.cards[uid].num === c.num),
  teamUpInActiveAtLeast: (cx, c) => teamUpCount(cx.state, cx.side) >= c.n,
  selfHasActiveStack: (cx, c) => {
    const a = cx.defs[cx.side].active;
    return !!(a && a.stack === c.stack);
  },
  // Capa 2: el rival recibe al menos una modificación positiva (de cualquier origen).
  foeHasPositive: (cx) =>
    (cx.entries || []).some((e) => e.side === cx.foe && e.amount > 0 && !e.removed),
};

export function teamUpCount(state, side) {
  return state.players[side].activeZone.filter((uid) => {
    const a = cardDef(state.cards[uid].num).active;
    return a && a.stack === 'teamUp';
  }).length;
}

export function evalCondition(cond, cx) {
  if (!cond) return true;
  if (cond.all) return cond.all.every((c) => evalCondition(c, cx));
  if (cond.any) return cond.any.some((c) => evalCondition(c, cx));
  if (cond.not) return !evalCondition(cond.not, cx);
  const fn = CONDITIONS[cond.if];
  if (!fn) throw new Error(`Condición desconocida: ${cond.if}`);
  return !!fn(cx, cond);
}

export function multiplierFor(effect, cx) {
  if (!effect.per) return 1;
  const fn = COUNTERS[effect.per];
  if (!fn) throw new Error(`Contador desconocido: ${effect.per}`);
  return fn(cx);
}

// Genera las entradas de modificación (capa 1) de un efecto "mod".
// Devuelve [] si la condición no se cumple o el multiplicador es 0.
export function generateModEntries(effect, cx, origin, sourceLabel, sourceUid) {
  if (effect.type !== 'mod') return [];
  if (effect.layer === 2) return [];
  if (!evalCondition(effect.when, cx)) return [];
  const mult = multiplierFor(effect, cx);
  if (!mult) return [];
  const targetSide = effect.target === 'foe' ? cx.foe : cx.side;
  return [
    {
      side: targetSide,
      attrs: effect.attrs || 'all',
      amount: effect.amount * mult,
      origin,
      source: sourceLabel,
      sourceUid,
      label: td(effect.label) || sourceLabel,
      detail: effect.per && mult !== 1 ? `${effect.amount > 0 ? '+' : ''}${effect.amount} × ${mult}` : null,
    },
  ];
}

export function generateLayer2ModEntries(effect, cx, origin, sourceLabel, sourceUid) {
  if (effect.type !== 'mod' || effect.layer !== 2) return [];
  if (!evalCondition(effect.when, cx)) return [];
  const mult = multiplierFor(effect, cx);
  if (!mult) return [];
  return [
    {
      side: effect.target === 'foe' ? cx.foe : cx.side,
      attrs: effect.attrs || 'all',
      amount: effect.amount * mult,
      origin,
      source: sourceLabel,
      sourceUid,
      label: td(effect.label) || sourceLabel,
      detail: null,
    },
  ];
}

export function entryAppliesTo(entry, attr) {
  return entry.attrs === 'all' || entry.attrs.includes(attr);
}

export { ATTRS };
