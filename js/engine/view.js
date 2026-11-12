// Vista de partida para un jugador: copia del estado SIN la información oculta del rival.
// Es la única entrada permitida para la IA y para la interfaz. Tiene la misma forma que el estado,
// con las zonas ocultas del rival reemplazadas por marcadores anónimos (sólo se conserva la cantidad).
import { PLAYERS } from '../data/constants.js';
import { other } from './effects.js';

const clone = (x) => JSON.parse(JSON.stringify(x));

export function getView(state, viewer) {
  const foeSide = other(viewer);
  const view = clone({ ...state, cards: {}, scenarioDeck: [], players: {}, log: state.log });
  delete view.rngState; // la semilla permitiría predecir dados y barajas
  delete view.seed;
  view.viewer = viewer;
  view.scenarioDeckCount = state.scenarioDeck.length;
  const visible = new Set();
  const addAll = (arr) => arr.forEach((u) => visible.add(u));

  for (const side of PLAYERS) {
    const p = clone(state.players[side]);
    if (side === viewer) {
      addAll(p.reserve); addAll(p.hand); addAll(p.discard); addAll(p.activeZone);
      p.active.forEach(addAll);
    } else {
      addAll(p.discard); addAll(p.activeZone);
      const hide = (arr, tag) => arr.map((_, i) => `hidden-${side}-${tag}-${i}`);
      p.counts = { hand: p.hand.length, reserve: p.reserve.length, active: p.active.map((a) => a.length) };
      p.hand = hide(p.hand, 'hand');
      p.reserve = hide(p.reserve, 'reserve');
      p.active = p.active.map((a, i) => hide(a, `active${i}`));
      p.deckNums = [];
    }
    view.players[side] = p;
  }

  // Cartas jugadas en el duelo actual: la del rival sólo se ve después de la revelación.
  if (state.duel) {
    const d = view.duel;
    if (!state.duel.revealed) {
      d.picks[foeSide] = state.duel.locked[foeSide] ? 'hidden-pick' : null;
    } else {
      addAll([state.duel.picks.p1, state.duel.picks.p2].filter(Boolean));
    }
    if (state.duel.resolution) {
      const cs = state.duel.resolution.cards;
      addAll([cs.p1, cs.p2].filter(Boolean));
    }
  }
  for (const uid of visible) view.cards[uid] = { ...state.cards[uid] };
  view.cards.ghost = { uid: 'ghost', num: 0, owner: foeSide };
  view.foeSide = foeSide;
  return view;
}
