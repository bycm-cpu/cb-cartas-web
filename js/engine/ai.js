// IA del oponente. Sólo recibe una VISTA (getView): nunca el estado completo, así que no puede
// consultar cartas ocultas del jugador. Estructura preparada para sumar dificultades.
import { ATTRS } from '../data/constants.js';
import { cardDef, totalStats } from './catalog.js';
import { computeDuel, compareAt } from './duel.js';
import { eligibleSwap } from './game.js';
import { other } from './effects.js';

export const AI_LEVELS = {
  // `noise`: probabilidad de elegir una carta que no sea la mejor estimada.
  easy: { id: 'easy', label: 'Fácil', noise: 0.45 },
  normal: { id: 'normal', label: 'Normal', noise: 0.12 },
};

// Valor esperado de jugar `uid` ahora, contra un rival "promedio" (la carta rival es desconocida).
function estimate(view, me, uid) {
  const foe = other(me);
  const cards = { [me]: uid, [foe]: 'ghost' };
  const result = computeDuel(view, { attr: view.duel.attr, cards, extraEntries: [] });
  const attr = view.duel.attr;
  const own = result.final[me][attr];
  const opp = result.final[foe][attr];
  const edge = result.lowestWins ? opp - own : own - opp;
  return { edge, own, uid };
}

export function chooseCard(view, level = AI_LEVELS.normal, rand = Math.random) {
  const me = view.viewer;
  const hand = view.players[me].hand;
  if (!hand.length) return null;
  const scored = hand.map((uid) => estimate(view, me, uid)).sort((a, b) => b.edge - a.edge);
  // Gastar primero las cartas "baratas": a igualdad de ventaja, se prefiere la de menor valor total
  // para guardar las fuertes para los duelos siguientes de la ronda.
  if (rand() < level.noise && scored.length > 1) return scored[1 + Math.floor(rand() * (scored.length - 1))].uid;
  const best = scored[0].edge;
  const ties = scored.filter((s) => s.edge >= best - 1);
  ties.sort((a, b) => totalStats(cardDef(view.cards[a.uid].num)) - totalStats(cardDef(view.cards[b.uid].num)));
  return ties[0].uid;
}

// Decisión de intercambio (Medium / Miss Capi). Usa sólo cartas propias.
export function decideChoice(view, choice) {
  const me = choice.player;
  const opts = eligibleSwap(view, me, choice);
  if (!opts.reserve.length || !opts.active.length) return { use: false };
  const total = (uid) => totalStats(cardDef(view.cards[uid].num));
  const bestReserve = opts.reserve.slice().sort((a, b) => total(b) - total(a))[0];
  const worstActive = opts.active.slice().sort((a, b) => total(a) - total(b))[0];
  const gain = choice.bonus * ATTRS.length + (total(bestReserve) - total(worstActive));
  if (gain > 0) return { use: true, reserveUid: bestReserve, activeUid: worstActive };
  return { use: false };
}

export function shouldUseDesarme(view) {
  const me = view.viewer;
  const foe = view.players[other(me)];
  return foe.activeZone.length > 0;
}

export { compareAt };
