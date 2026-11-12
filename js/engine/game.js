// Motor de partida: estado, máquina de estados y transiciones. No conoce la interfaz ni la IA.
//
// Fases (state.phase):
//   round_intro  -> se reveló el escenario y se repartieron las manos. Acción: ACK
//   duel_roll    -> falta lanzar el dado. Acción: ROLL
//   duel_pick    -> cada jugador elige y bloquea una carta. Acción: PLAY_CARD
//   duel_choice  -> hay decisiones de habilidades pendientes. Acción: RESOLVE_CHOICE
//   duel_result  -> resultado del duelo ya aplicado. Acción: ACK
//   round_result -> resultado del Round. Acción: ACK
//   game_over    -> fin de la partida.
//
// Toda acción se valida; si es inválida devuelve { ok:false, error } y no cambia el estado.
import { ATTRS, ATTR_NAMES, DICE_TO_ATTR, PLAYERS, RULES } from '../data/constants.js';
import { cardDef, scenarioDef, allScenarioIds } from './catalog.js';
import { validateArrangement } from './arrange.js';
import { randInt, rollD6, shuffle } from './rng.js';
import { computeDuel, compareAt, summarizeEntries, abilitiesEnabled, currentScenario } from './duel.js';
import { onScenarioStart } from './scenarioEffects.js';
import { other } from './effects.js';
import { validateDeck } from './deck.js';
import { t, td } from '../i18n.js';

export const PHASES = ['round_intro', 'duel_roll', 'duel_pick', 'duel_choice', 'duel_result', 'round_result', 'game_over'];

// Textos en voseo, desde el punto de vista del jugador local (p1 = "vos", p2 = "el rival").
const tw = (side, you, foe, params) => t(side === 'p1' ? you : foe, params);
const gana = (side) => t(side === 'p1' ? 'Ganás vos' : 'Gana el rival');

function say(state, text, kind = 'info') {
  state.logSeq += 1;
  state.log.push({ n: state.logSeq, kind, round: state.round, text });
}

const pname = (state, side) => state.players[side].name;

// ---------------------------------------------------------------------------------------------
// Creación
// ---------------------------------------------------------------------------------------------

export function createGame({ seed, decks, names = {}, config = {}, arrangements = {}, dieMods = {} }) {
  for (const side of PLAYERS) {
    const errors = validateDeck(decks[side]);
    if (errors.length) throw new Error(t('Mazo inválido para {side}: {errors}', { side, errors: errors.join(' ') }));
  }
  const state = {
    version: 1,
    seed: seed >>> 0,
    rngState: seed >>> 0,
    config: { ...RULES, ...config },
    // Mejoras de dado de uso limitado (sólo modo Aventura): { p1: { reroll: n, nudge: n } }. Vacío = reglas del PDF.
    dieMods: { p1: { ...(dieMods.p1 || {}) }, p2: { ...(dieMods.p2 || {}) } },
    phase: 'round_intro',
    round: 0,
    duelIndex: 0,
    roundsCompleted: 0,
    roundWins: { p1: 0, p2: 0 },
    roundResults: [],
    roundDuels: [],
    duelsFinished: 0,
    lastDuelAttr: null,
    scenarioDeck: [],
    scenarioDiscard: [],
    scenario: null,
    scenarioFlags: {},
    cards: {},
    players: {},
    duel: null,
    winner: null,
    log: [],
    logSeq: 0,
  };

  for (const side of PLAYERS) {
    const nums = decks[side];
    const uids = nums.map((n) => {
      const uid = `${side}-${n}`;
      state.cards[uid] = { uid, num: n, owner: side };
      return uid;
    });
    // Si el jugador eligió el reparto (variante) se usa; si no, se baraja como dice el PDF.
    const arr = arrangements[side];
    const useArr = arr && validateArrangement(nums, arr).length === 0;
    const shuffled = useArr ? null : shuffle(state, uids);
    const R = state.config.reserveSize;
    const toUid = (n) => `${side}-${n}`;
    const reserve = useArr ? arr.reserve.map(toUid) : shuffled.slice(0, R);
    const rest = useArr ? arr.active.flat().map(toUid) : shuffled.slice(R);
    state.players[side] = {
      id: side,
      name: names[side] || (side === 'p1' ? 'Vos' : 'Rival'),
      deckNums: nums.slice(),
      reserve,
      active: [rest.slice(0, 3), rest.slice(3, 6), rest.slice(6, 9)],
      hand: [],
      discard: [],
      activeZone: [],
      duelsLost: 0,
      playedThisRound: 0,
      history: [],
      carry: [],
    };
  }
  state.scenarioDeck = shuffle(state, allScenarioIds());
  say(state, t('Se barajaron los mazos: 9 cartas a la Reserva y 3 Mazos Activos de 3 cartas para cada jugador.'), 'setup');
  startRound(state, 1);
  return state;
}

// ---------------------------------------------------------------------------------------------
// Rounds y duelos
// ---------------------------------------------------------------------------------------------

function startRound(state, round) {
  state.round = round;
  state.duelIndex = 0;
  state.roundDuels = [];
  state.duel = null;
  if (state.scenario) state.scenarioDiscard.push(state.scenario.id);
  if (state.scenarioDeck.length === 0) {
    state.scenarioDeck = shuffle(state, state.scenarioDiscard);
    state.scenarioDiscard = [];
  }
  const id = state.scenarioDeck.shift();
  state.scenario = { id };
  const sc = scenarioDef(id);
  for (const side of PLAYERS) {
    const p = state.players[side];
    p.playedThisRound = 0;
    p.hand = p.active[round - 1].slice();
    p.active[round - 1] = [];
  }
  say(state, t('Ronda {round}. Escenario: {name} ({province}). {text}', { round, name: sc.name, province: sc.province, text: td(sc.text) }), 'round');
  const started = onScenarioStart(state, sc, {
    randInt: (n) => randInt(state, n),
    attrName: (a) => ATTR_NAMES[a],
  });
  state.scenarioFlags = started.flags;
  for (const n of started.notes) say(state, n, 'scenario');
  state.phase = 'round_intro';
}

function startDuel(state) {
  const number = state.duelIndex + 1;
  state.duel = {
    number,
    attr: null,
    rolls: [],
    picks: { p1: null, p2: null },
    locked: { p1: false, p2: false },
    modUsed: { p1: false, p2: false },
    revealed: false,
    pendingChoices: [],
    extraEntries: [],
    choiceSeq: 0,
    resolution: null,
  };
  const h1 = state.players.p1.hand.length;
  const h2 = state.players.p2.hand.length;
  if (h1 === 0 || h2 === 0) {
    resolveEmptyHand(state, h1, h2);
    return;
  }
  const fixed = state.scenarioFlags.fixedAttrs;
  if (fixed) {
    state.duel.attr = fixed[state.duelIndex];
    say(state, t('Duelo {number}: el escenario fija el atributo: {attr}.', { number, attr: ATTR_NAMES[state.duel.attr] }), 'duel');
    state.phase = 'duel_pick';
  } else {
    say(state, t('Duelo {number} de la Ronda {round}.', { number, round: state.round }), 'duel');
    state.phase = 'duel_roll';
  }
}

// PDF: "si por alguna Habilidad los jugadores no tienen cartas para jugar un Duelo, lo gana
// automáticamente el contrincante". Si ninguno tiene cartas, se define con el dado (R-09).
function resolveEmptyHand(state, h1, h2) {
  const d = state.duel;
  let winner;
  let reason;
  if (h1 === 0 && h2 === 0) {
    let a, b;
    do { a = rollD6(state); b = rollD6(state); } while (a === b);
    winner = a > b ? 'p1' : 'p2';
    reason = t('Ninguno tiene cartas para jugar el duelo: se define con el dado ({a} contra {b}).', { a, b });
  } else {
    winner = h1 === 0 ? 'p2' : 'p1';
    reason = tw(winner, 'El rival no tiene cartas para jugar el duelo: lo ganás vos automáticamente.', 'No tenés cartas para jugar el duelo: lo gana el rival automáticamente.');
  }
  d.resolution = {
    cards: { p1: null, p2: null },
    attr: null,
    attrOriginal: null,
    winner,
    reason,
    auto: true,
    sides: { p1: null, p2: null },
    notes: [],
    steps: [],
    redo: null,
    tie: null,
  };
  say(state, reason, 'result');
  finishDuelBookkeeping(state, d.resolution);
  state.phase = 'duel_result';
}

// ---------------------------------------------------------------------------------------------
// Acciones
// ---------------------------------------------------------------------------------------------

export function dispatch(state, action) {
  const fail = (error) => ({ ok: false, error });
  if (!action || !PLAYERS.includes(action.player)) return fail(t('Acción inválida: falta el jugador.'));
  if (state.phase === 'game_over' && action.type !== 'NOOP') return fail(t('La partida ya terminó.'));
  switch (action.type) {
    case 'ACK':
      return doAck(state, action);
    case 'ROLL':
      return doRoll(state, action);
    case 'PLAY_CARD':
      return doPlayCard(state, action);
    case 'RESOLVE_CHOICE':
      return doResolveChoice(state, action);
    case 'USE_DESARME':
      return doUseDesarme(state, action);
    case 'USE_DIE_MOD':
      return doUseDieMod(state, action);
    default:
      return fail(t('Acción desconocida.'));
  }
}

function doAck(state, action) {
  switch (state.phase) {
    case 'round_intro':
      startDuel(state);
      return { ok: true };
    case 'duel_result': {
      const res = state.duel.resolution;
      const wins = roundDuelWins(state);
      const decided =
        (res.winsRound && state.config.absoluteTieWinsRound) ||
        state.duelIndex >= state.config.duelsPerRound - 1 ||
        (state.config.earlyRoundEnd && (wins.p1 >= 2 || wins.p2 >= 2));
      if (decided) endRound(state);
      else {
        state.duelIndex += 1;
        startDuel(state);
      }
      return { ok: true };
    }
    case 'round_result': {
      const needed = state.config.roundsToWin;
      if (state.roundWins.p1 >= needed || state.roundWins.p2 >= needed || state.roundsCompleted >= state.config.totalRounds) {
        state.winner = state.roundWins.p1 > state.roundWins.p2 ? 'p1' : 'p2';
        state.phase = 'game_over';
        say(state, tw(state.winner, 'Fin de la partida. Ganaste la partida.', 'Fin de la partida. El rival ganó la partida.'), 'game');
      } else {
        startRound(state, state.round + 1);
      }
      return { ok: true };
    }
    default:
      return { ok: false, error: t('No hay nada que confirmar en este momento.') };
  }
}

function doRoll(state) {
  if (state.phase !== 'duel_roll') return { ok: false, error: t('Ahora no se puede lanzar el dado.') };
  const d = state.duel;
  const banned = state.scenarioFlags.bannedAttrs || [];
  for (let i = 0; i < 50; i++) {
    const die = rollD6(state);
    const attr = DICE_TO_ATTR[die];
    const isBanned = banned.includes(attr);
    d.rolls.push({ die, attr, banned: isBanned });
    if (isBanned) {
      say(state, t('Dado: {die} ({attr}), pero ese atributo está anulado por el escenario. Se vuelve a tirar.', { die, attr: ATTR_NAMES[attr] }), 'dice');
      continue;
    }
    d.attr = attr;
    say(state, t('Dado: {die}. Atributo del duelo: {attr}.', { die, attr: ATTR_NAMES[attr] }), 'dice');
    break;
  }
  state.phase = 'duel_pick';
  return { ok: true, attr: d.attr };
}

function doPlayCard(state, { player, uid }) {
  if (state.phase !== 'duel_pick') return { ok: false, error: t('Ahora no se puede jugar una carta.') };
  const d = state.duel;
  if (d.locked[player]) return { ok: false, error: t('Ya elegiste tu carta para este duelo.') };
  const p = state.players[player];
  if (!p.hand.includes(uid)) return { ok: false, error: t('Esa carta no está en tu mano.') };
  d.picks[player] = uid;
  d.locked[player] = true;
  if (d.locked.p1 && d.locked.p2) reveal(state);
  return { ok: true };
}

function reveal(state) {
  const d = state.duel;
  d.revealed = true;
  const c1 = cardDef(state.cards[d.picks.p1].num);
  const c2 = cardDef(state.cards[d.picks.p2].num);
  say(state, t('Se revelan las cartas: vos jugás a {a} y el rival juega a {b}.', { a: c1.name, b: c2.name }), 'reveal');
  state.phase = 'duel_pick';
  collectChoices(state);
  if (d.pendingChoices.length) {
    state.phase = 'duel_choice';
  } else {
    resolveDuel(state);
  }
}

// ---------------------------------------------------------------------------------------------
// Decisiones de habilidades (intercambios de cartas)
// ---------------------------------------------------------------------------------------------

function eligibleActiveDecks(state, side) {
  // Mazos Activos de los Rounds que todavía no se juegan (el del Round en curso ya está en la mano).
  const p = state.players[side];
  const out = [];
  for (let i = state.round; i < 3; i++) p.active[i].forEach((uid) => out.push(uid));
  return out;
}

export function eligibleSwap(state, side, choice) {
  const p = state.players[side];
  const reserve = p.reserve.filter((uid) => {
    const f = choice.reserveFilter;
    if (!f) return true;
    const def = cardDef(state.cards[uid].num);
    if (f.activeStack) return !!(def.active && def.active.stack === f.activeStack);
    return true;
  });
  return { reserve, active: eligibleActiveDecks(state, side) };
}

function collectChoices(state) {
  const d = state.duel;
  if (!abilitiesEnabled(state)) return;
  for (const side of PLAYERS) {
    const def = cardDef(state.cards[d.picks[side]].num);
    if (!def.ability) continue;
    for (const eff of def.ability.effects) {
      if (eff.type !== 'choice') continue;
      d.choiceSeq += 1;
      const choice = {
        id: `c${d.choiceSeq}`,
        player: side,
        kind: eff.kind,
        bonus: eff.bonus || 0,
        reserveFilter: eff.reserveFilter || null,
        cardUid: d.picks[side],
        cardNum: def.num,
        abilityName: def.ability.name,
      };
      const opts = eligibleSwap(state, side, choice);
      if (!opts.reserve.length || !opts.active.length) {
        say(state, tw(side, '{card} (vos): {ability} no puede usarse ahora (no hay cartas elegibles para intercambiar).', '{card} (rival): {ability} no puede usarse ahora (no hay cartas elegibles para intercambiar).', { card: def.name, ability: td(def.ability.name) }), 'ability');
        continue;
      }
      d.pendingChoices.push(choice);
    }
  }
}

function doResolveChoice(state, { player, id, use, reserveUid, activeUid }) {
  if (state.phase !== 'duel_choice') return { ok: false, error: t('No hay decisiones pendientes.') };
  const d = state.duel;
  const idx = d.pendingChoices.findIndex((c) => c.id === id && c.player === player);
  if (idx < 0) return { ok: false, error: t('Esa decisión no te corresponde o ya fue resuelta.') };
  const choice = d.pendingChoices[idx];
  const def = cardDef(choice.cardNum);
  if (use) {
    const opts = eligibleSwap(state, player, choice);
    if (!opts.reserve.includes(reserveUid)) return { ok: false, error: t('La carta elegida de tu Reserva no es válida para esta habilidad.') };
    if (!opts.active.includes(activeUid)) return { ok: false, error: t('La carta elegida no está en un Mazo Activo que todavía no se juegue.') };
    const p = state.players[player];
    const ri = p.reserve.indexOf(reserveUid);
    let deckIdx = -1;
    let cardIdx = -1;
    for (let i = state.round; i < 3; i++) {
      const k = p.active[i].indexOf(activeUid);
      if (k >= 0) { deckIdx = i; cardIdx = k; }
    }
    p.reserve[ri] = activeUid;
    p.active[deckIdx][cardIdx] = reserveUid;
    const rn = cardDef(state.cards[reserveUid].num).name;
    const an = cardDef(state.cards[activeUid].num).name;
    say(state, tw(player, 'Usaste {ability}: intercambiaste {an} (Mazo Activo) por {rn} (Reserva).', 'El rival usó {ability}: intercambió {an} (Mazo Activo) por {rn} (Reserva).', { ability: td(def.ability.name), an, rn }), 'ability');
    if (choice.bonus) {
      d.extraEntries.push({
        side: player, attrs: 'all', amount: choice.bonus, origin: 'choice',
        source: def.name, label: `${def.name}: ${def.ability.name}`, detail: null,
      });
    }
  } else {
    say(state, tw(player, 'Decidiste no usar {ability}.', 'El rival decidió no usar {ability}.', { ability: td(def.ability.name) }), 'ability');
  }
  d.pendingChoices.splice(idx, 1);
  if (!d.pendingChoices.length) resolveDuel(state);
  return { ok: true };
}

// Mejoras de uso limitado del modo Aventura (no existen en el PDF; con `dieMods` vacío no hacen nada). Una por duelo.
//  'reroll': repetir la tirada.  'nudge' (dir +1 / -1): mover el dado una cara.      (después de tirar, antes de elegir carta)
//  'loaded' (attr): elegir el atributo sin tirar el dado.                            (antes de tirar)
//  'boost': +BOOST a todos los atributos de tu carta en este duelo.                  (después de tirar, antes de elegir carta)
export const BOOST_AMOUNT = 10;
function doUseDieMod(state, { player, mod, dir, attr }) {
  const d = state.duel;
  const early = state.phase === 'duel_roll';
  if (!d || d.revealed || d.locked[player] || (state.phase !== 'duel_pick' && !early)) return { ok: false, error: t('Ahora no podés usar una mejora de dado.') };
  if (d.modUsed[player]) return { ok: false, error: t('Ya usaste una mejora de dado en este duelo.') };
  const bag = state.dieMods[player];
  if (!['reroll', 'nudge', 'loaded', 'boost'].includes(mod)) return { ok: false, error: t('Acción desconocida.') };
  if (!(bag[mod] > 0)) return { ok: false, error: t('No te quedan usos de esa mejora.') };
  if ((mod === 'loaded') !== early) return { ok: false, error: t('Ahora no podés usar una mejora de dado.') };
  const banned = state.scenarioFlags.bannedAttrs || [];
  if (mod === 'boost') {
    bag.boost -= 1;
    d.modUsed[player] = true;
    d.extraEntries.push({ side: player, attrs: 'all', amount: BOOST_AMOUNT, origin: 'item', source: t('Refuerzo'), label: t('Refuerzo'), detail: null });
    say(state, tw(player, 'Usaste un Refuerzo: +{n} a todos los atributos de tu carta en este duelo.', 'El rival usó un Refuerzo: +{n} a todos los atributos de su carta en este duelo.', { n: BOOST_AMOUNT }), 'ability');
    return { ok: true };
  }
  let die;
  if (mod === 'loaded') {
    die = Number(Object.keys(DICE_TO_ATTR).find((k) => DICE_TO_ATTR[k] === attr));
    if (!die) return { ok: false, error: t('Elegí un atributo.') };
    if (banned.includes(attr)) return { ok: false, error: t('Ese atributo está anulado por el escenario.') };
  } else if (!d.rolls.length) return { ok: false, error: t('En este duelo el atributo no sale del dado.') };
  else if (mod === 'reroll') {
    for (let i = 0; i < 50; i++) {
      die = rollD6(state);
      if (!banned.includes(DICE_TO_ATTR[die])) break;
    }
  } else {
    const last = d.rolls[d.rolls.length - 1];
    die = ((last.die - 1 + (dir === -1 ? -1 : 1) + 6) % 6) + 1;
    if (banned.includes(DICE_TO_ATTR[die])) return { ok: false, error: t('Ese atributo está anulado por el escenario.') };
  }
  bag[mod] -= 1;
  d.modUsed[player] = true;
  d.rolls.push({ die, attr: DICE_TO_ATTR[die], banned: false, mod });
  d.attr = DICE_TO_ATTR[die];
  if (early) state.phase = 'duel_pick';
  say(state, tw(player, mod === 'loaded' ? 'Usaste un dado cargado. Atributo del duelo: {attr}.' : 'Usaste una mejora de dado: ahora salió {die}. Atributo del duelo: {attr}.', mod === 'loaded' ? 'El rival usó un dado cargado. Atributo del duelo: {attr}.' : 'El rival usó una mejora de dado: ahora salió {die}. Atributo del duelo: {attr}.', { die, attr: ATTR_NAMES[d.attr] }), 'dice');
  return { ok: true, attr: d.attr };
}

// Efecto Activo "a pedido" (Caballero Rojo 35°): descartar esa carta para descartar el Efecto Activo del rival.
function doUseDesarme(state, { player }) {
  if (state.phase !== 'duel_roll' && state.phase !== 'duel_pick') return { ok: false, error: t('Ahora no podés usar un Efecto Activo.') };
  if (state.duel && state.duel.revealed) return { ok: false, error: t('Las cartas ya fueron reveladas.') };
  const p = state.players[player];
  const foe = state.players[other(player)];
  const uid = p.activeZone.find((u) => {
    const a = cardDef(state.cards[u].num).active;
    return a && a.onDemand && a.onDemand.kind === 'discardFoeActive';
  });
  if (!uid) return { ok: false, error: t('No tenés un Efecto Activo para usar.') };
  if (!foe.activeZone.length) return { ok: false, error: t('El rival no tiene Efecto Activo para descartar.') };
  p.activeZone.splice(p.activeZone.indexOf(uid), 1);
  p.discard.push(uid);
  const n = foe.activeZone.length;
  while (foe.activeZone.length) foe.discard.push(foe.activeZone.shift());
  say(state, tw(player, 'Descartaste a {card} para descartar el Efecto Activo del rival ({n} carta/s).', 'El rival descartó a {card} para descartar tu Efecto Activo ({n} carta/s).', { card: cardDef(state.cards[uid].num).name, n }), 'ability');
  return { ok: true };
}

// ---------------------------------------------------------------------------------------------
// Resolución
// ---------------------------------------------------------------------------------------------

function pickByRoll(state, available) {
  // Tira el dado hasta que salga un atributo disponible; registra las tiradas.
  const rolls = [];
  for (let i = 0; i < 100; i++) {
    const die = rollD6(state);
    const attr = DICE_TO_ATTR[die];
    rolls.push({ die, attr });
    if (available.includes(attr)) return { attr, rolls };
  }
  return { attr: available[0], rolls };
}

function resolveDuel(state) {
  const d = state.duel;
  const cards = { p1: d.picks.p1, p2: d.picks.p2 };
  const flags = state.scenarioFlags;
  const banned = flags.bannedAttrs || [];
  const fixed = flags.fixedAttrs;
  const names = { p1: pname(state, 'p1'), p2: pname(state, 'p2') };
  const attrOriginal = d.attr;
  let attr = d.attr;
  let result = computeDuel(state, { attr, cards, extraEntries: d.extraEntries });
  const resolution = {
    cards,
    attrOriginal,
    attr,
    winner: null,
    reason: '',
    notes: result.notes.slice(),
    steps: [],
    redo: null,
    tie: null,
    winsRound: false,
    sides: null,
    auto: false,
  };
  const defs = result.defs;
  const sfl = result.sideFlags;

  const decideAuto = () => {
    if (!!sfl.p1.autoLose !== !!sfl.p2.autoLose) {
      const loser = sfl.p1.autoLose ? 'p1' : 'p2';
      return { winner: other(loser), reason: tw(loser, '{card}: Lavado de Cerebro. Perdés este duelo.', '{card}: Lavado de Cerebro. El rival pierde este duelo.', { card: defs[loser].name }) };
    }
    return null;
  };

  let outcome = decideAuto();
  if (outcome) {
    resolution.winner = outcome.winner;
    resolution.reason = outcome.reason;
  } else {
    let cmp = compareAt(result, attr);
    // Carismático: si pierde por 40 o más, se rehace el duelo con otro atributo.
    if (cmp.winner) {
      const loser = other(cmp.winner);
      const rd = sfl[loser].redo;
      if (rd && cmp.diff >= rd.margin && attr !== rd.attr && !fixed && !banned.includes(rd.attr)) {
        resolution.redo = { side: loser, from: attr, to: rd.attr, margin: cmp.diff, card: defs[loser].name };
        say(state, t('{card} pierde por {diff} en {attr}: Carismático. Se rehace el duelo con {attr2}.', { card: defs[loser].name, diff: cmp.diff, attr: ATTR_NAMES[attr], attr2: ATTR_NAMES[rd.attr] }), 'ability');
        attr = rd.attr;
        result = computeDuel(state, { attr, cards, extraEntries: d.extraEntries });
        cmp = compareAt(result, attr);
      }
    }
    resolution.attr = attr;
    resolution.compare = cmp;
    if (cmp.winner) {
      resolution.winner = cmp.winner;
      resolution.reason = result.lowestWins
        ? t('{who}: en este escenario gana el valor más bajo ({v1} contra {v2}).', { who: gana(cmp.winner), v1: cmp.v1, v2: cmp.v2 })
        : t('{who} por {diff} en {attr} ({v1} contra {v2}).', { who: gana(cmp.winner), diff: cmp.diff, attr: ATTR_NAMES[attr], v1: cmp.v1, v2: cmp.v2 });
    } else {
      // Empate
      const tie = { rerolls: [], tried: [attr], absolute: null, byAbility: null };
      resolution.tie = tie;
      say(state, t('Empate en {attr} ({v} contra {v}).', { attr: ATTR_NAMES[attr], v: cmp.v1 }), 'tie');
      const t1 = !!sfl.p1.tiesWin;
      const t2 = !!sfl.p2.tiesWin;
      if (t1 !== t2) {
        const w = t1 ? 'p1' : 'p2';
        tie.byAbility = defs[w].name;
        resolution.winner = w;
        resolution.reason = tw(w, 'Empate: los empates los ganás vos (Heroísmo).', 'Empate: los empates los gana el rival (Heroísmo).');
      } else {
        let decided = false;
        while (!fixed) {
          const available = ATTRS.filter((a) => !tie.tried.includes(a) && !banned.includes(a));
          if (!available.length) break;
          const { attr: na, rolls } = pickByRoll(state, available);
          tie.rerolls.push({ attr: na, rolls });
          tie.tried.push(na);
          attr = na;
          resolution.attr = na;
          say(state, t('Desempate: nueva tirada, atributo {attr}.', { attr: ATTR_NAMES[na] }), 'tie');
          const c2 = compareAt(result, na);
          if (c2.winner) {
            resolution.winner = c2.winner;
            resolution.compare = c2;
            resolution.reason = t('Desempate en {attr}: {who} ({v1} contra {v2}).', { attr: ATTR_NAMES[na], who: gana(c2.winner).toLowerCase(), v1: c2.v1, v2: c2.v2 });
            decided = true;
            break;
          }
        }
        if (!decided) absoluteTiebreak(state, resolution, attr, names);
      }
    }
  }

  resolution.sides = {
    p1: describeSide(state, result, 'p1', resolution.attr),
    p2: describeSide(state, result, 'p2', resolution.attr),
  };
  resolution.notes = resolution.notes.concat(result.notes.filter((n) => !resolution.notes.includes(n)));
  resolution.sideFlags = JSON.parse(JSON.stringify(sfl));
  d.resolution = resolution;
  say(state, resolution.reason, 'result');
  finishDuelBookkeeping(state, resolution);
  state.phase = 'duel_result';
}

function describeSide(state, result, side, attr) {
  const def = result.defs[side];
  return {
    cardNum: def.num,
    base: { ...def.stats },
    final: { ...result.final[side] },
    value: result.final[side][attr],
    entries: summarizeEntries(result, side),
  };
}

// Empate absoluto (PDF, Resolución).
function absoluteTiebreak(state, resolution, lastAttr, names) {
  const tie = resolution.tie;
  const p1 = state.players.p1;
  const p2 = state.players.p2;
  const top1 = p1.reserve[0];
  const top2 = p2.reserve[0];
  const abs = { kind: 'absolute', cards: { p1: top1 || null, p2: top2 || null }, attr: lastAttr, dice: [] };
  tie.absolute = abs;
  let winner;
  let reason;
  const attrLast = lastAttr || ATTRS[0];
  if (top1 && top2) {
    p1.reserve.shift();
    p2.reserve.shift();
    p1.discard.push(top1);
    p2.discard.push(top2);
    const v1 = cardDef(state.cards[top1].num).stats[attrLast];
    const v2 = cardDef(state.cards[top2].num).stats[attrLast];
    abs.values = { p1: v1, p2: v2 };
    if (v1 !== v2) {
      winner = v1 > v2 ? 'p1' : 'p2';
      reason = t('Empate absoluto: cada jugador toma la carta superior de su Reserva y se enfrentan en {attr} ({v1} contra {v2}). {who}.', { attr: ATTR_NAMES[attrLast], v1, v2, who: gana(winner) });
    }
  } else if (top1 || top2) {
    winner = top1 ? 'p1' : 'p2';
    reason = t(winner === 'p1' ? 'Empate absoluto: el rival no tiene cartas en la Reserva para el desempate. {who}.' : 'Empate absoluto: no tenés cartas en la Reserva para el desempate. {who}.', { who: gana(winner) });
  }
  if (!winner) {
    let a, b;
    do { a = rollD6(state); b = rollD6(state); abs.dice.push([a, b]); } while (a === b);
    winner = a > b ? 'p1' : 'p2';
    reason = t('Empate absoluto sin cartas que los desempaten: se define con el dado ({a} contra {b}). {who}.', { a, b, who: gana(winner) });
  }
  resolution.winner = winner;
  resolution.reason = reason;
  resolution.winsRound = true;
  if (state.config.absoluteTieWinsRound) resolution.reason += ' ' + tw(winner, 'Ganás la Ronda.', 'El rival gana la Ronda.');
}

// Aplica el resultado: contadores, descartes y Efectos Activos. Es atómico respecto del estado.
function finishDuelBookkeeping(state, resolution) {
  const winner = resolution.winner;
  // Además del ganador se guardan las cartas y los valores finales de cada lado: la interfaz los muestra al cerrar la Ronda (sólo lectura, no afecta las reglas).
  const abs = resolution.tie && resolution.tie.absolute ? resolution.tie.absolute : null;
  const recap = { cards: {}, values: {} };
  for (const side of PLAYERS) {
    const sd = resolution.sides && resolution.sides[side];
    recap.cards[side] = sd ? sd.cardNum : (resolution.cards[side] ? state.cards[resolution.cards[side]].num : null);
    recap.values[side] = sd ? sd.value : (abs && abs.values ? abs.values[side] : null);
  }
  state.roundDuels.push({ winner, attr: resolution.attr, ...recap });
  for (const side of PLAYERS) {
    const p = state.players[side];
    const won = side === winner;
    p.history.push({ won, attr: resolution.attr, cardNum: resolution.cards[side] ? state.cards[resolution.cards[side]].num : null });
    if (!won) p.duelsLost += 1;
  }
  state.duelsFinished += 1;
  state.lastDuelAttr = resolution.attr;
  for (const side of PLAYERS) {
    const uid = resolution.cards[side];
    const p = state.players[side];
    if (!uid) continue;
    p.carry = []; // los bonos arrastrados se consumen al jugar la siguiente carta
    p.playedThisRound += 1;
    p.hand.splice(p.hand.indexOf(uid), 1);
    const def = cardDef(state.cards[uid].num);
    if (def.active) addToActiveZone(state, side, uid, def);
    else p.discard.push(uid);
    const flags = resolution.sideFlags ? resolution.sideFlags[side] : null;
    if (flags && flags.nextCardBonus) {
      const amount = flags.nextCardBonus.amount + (side === winner ? flags.nextCardBonus.winExtra : 0);
      p.carry.push({
        amount,
        source: def.name,
        label: t('{card}: {ability} (+{amount} a tu siguiente carta)', { card: def.name, ability: td(def.ability.name), amount }),
      });
      say(state, tw(side, '{card} otorgará +{amount} a la siguiente carta que juegues.', '{card} otorgará +{amount} a la siguiente carta que juegue el rival.', { card: def.name, amount }), 'ability');
    }
  }
}

function addToActiveZone(state, side, uid, def) {
  const p = state.players[side];
  const stack = def.active.stack;
  const compatible = stack && p.activeZone.every((u) => {
    const a = cardDef(state.cards[u].num).active;
    return a && a.stack === stack;
  });
  if (!compatible) {
    while (p.activeZone.length) p.discard.push(p.activeZone.shift());
  }
  p.activeZone.push(uid);
  say(state, tw(side, '{card} pasa a tu zona de Efecto Activo ({effect}).', '{card} pasa a la zona de Efecto Activo del rival ({effect}).', { card: def.name, effect: td(def.active.name) }), 'active');
}

export function roundDuelWins(state) {
  const w = { p1: 0, p2: 0 };
  for (const r of state.roundDuels) w[r.winner] += 1;
  return w;
}

function endRound(state) {
  const wins = roundDuelWins(state);
  const last = state.duel && state.duel.resolution;
  let winner;
  let byTiebreak = false;
  if (last && last.winsRound && state.config.absoluteTieWinsRound) {
    winner = last.winner;
    byTiebreak = true;
  } else {
    winner = wins.p1 > wins.p2 ? 'p1' : 'p2';
  }
  for (const side of PLAYERS) {
    const p = state.players[side];
    while (p.hand.length) p.reserve.push(p.hand.shift());
  }
  state.roundWins[winner] += 1;
  state.roundsCompleted += 1;
  state.roundResults.push({ round: state.round, winner, duelWins: wins, byTiebreak, scenarioId: state.scenario.id, duels: JSON.parse(JSON.stringify(state.roundDuels)) });
  say(
    state,
    t(winner === 'p1' ? 'Fin de la Ronda {round}: ganaste ({a} a {b} en duelos{tb}). Las cartas que quedaron en mano van al fondo de la Reserva.' : 'Fin de la Ronda {round}: ganó el rival ({a} a {b} en duelos{tb}). Las cartas que quedaron en mano van al fondo de la Reserva.', { round: state.round, a: wins.p1, b: wins.p2, tb: byTiebreak ? t(', por empate absoluto') : '' }),
    'round',
  );
  state.phase = 'round_result';
}

// ---------------------------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------------------------

export function legalActions(state, viewer) {
  const out = { ack: false, roll: false, playable: [], choice: null, desarme: false, dieMods: null };
  const phase = state.phase;
  if (phase === 'round_intro' || phase === 'duel_result' || phase === 'round_result') out.ack = true;
  if (phase === 'duel_roll') out.roll = true;
  if (phase === 'duel_pick' && !state.duel.locked[viewer]) out.playable = state.players[viewer].hand.slice();
  if (phase === 'duel_choice') out.choice = state.duel.pendingChoices.find((c) => c.player === viewer) || null;
  if ((phase === 'duel_pick' || phase === 'duel_roll') && !state.duel.revealed && !state.duel.locked[viewer] && !state.duel.modUsed[viewer]) {
    const bag = state.dieMods[viewer];
    const early = phase === 'duel_roll';
    const has = early ? { loaded: bag.loaded || 0 } : { reroll: state.duel.rolls.length ? bag.reroll || 0 : 0, nudge: state.duel.rolls.length ? bag.nudge || 0 : 0, boost: bag.boost || 0 };
    if (Object.values(has).some((n) => n > 0)) out.dieMods = { reroll: 0, nudge: 0, loaded: 0, boost: 0, ...has };
  }
  if (phase === 'duel_roll' || (phase === 'duel_pick' && !state.duel.revealed)) {
    const p = state.players[viewer];
    const foe = state.players[other(viewer)];
    out.desarme =
      foe.activeZone.length > 0 &&
      p.activeZone.some((u) => {
        const a = cardDef(state.cards[u].num).active;
        return a && a.onDemand && a.onDemand.kind === 'discardFoeActive';
      });
  }
  return out;
}

// Cada carta debe estar en exactamente una zona. Devuelve una lista de problemas (vacía si todo OK).
export function checkInvariants(state) {
  const problems = [];
  const where = {};
  const mark = (uid, zone) => {
    if (where[uid]) problems.push(`${uid} está en dos zonas: ${where[uid]} y ${zone}`);
    where[uid] = zone;
  };
  for (const side of PLAYERS) {
    const p = state.players[side];
    p.reserve.forEach((u) => mark(u, `${side}.reserve`));
    p.hand.forEach((u) => mark(u, `${side}.hand`));
    p.discard.forEach((u) => mark(u, `${side}.discard`));
    p.activeZone.forEach((u) => mark(u, `${side}.activeZone`));
    p.active.forEach((deck, i) => deck.forEach((u) => mark(u, `${side}.active${i}`)));
    const total = p.reserve.length + p.hand.length + p.discard.length + p.activeZone.length + p.active.flat().length;
    if (total !== state.config.deckSize) problems.push(`${side} tiene ${total} cartas en zonas (esperadas ${state.config.deckSize})`);
  }
  for (const uid of Object.keys(state.cards)) if (!where[uid]) problems.push(`${uid} no está en ninguna zona`);
  return problems;
}

export { currentScenario };
