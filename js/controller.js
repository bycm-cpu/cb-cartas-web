// Controlador de partida: conecta el motor con la interfaz y con el oponente.
// El oponente (IA hoy, otro jugador en red mañana) es un "agente" que sólo ve su vista y envía acciones:
// para PvP bastaría reemplazar `opponent` por un adaptador de red con la misma interfaz.
import { createGame, dispatch, legalActions } from './engine/game.js';
import { getView } from './engine/view.js';
import { randomValidDeck } from './engine/deck.js';
import { newSeed } from './engine/rng.js';
import { AI_LEVELS, chooseCard, decideChoice, shouldUseDesarme } from './engine/ai.js';
import { sleep } from './ui/util.js';
import { suggestArrangement } from './engine/arrange.js';

export class AIOpponent {
  constructor(level = AI_LEVELS.normal) {
    this.level = level;
    this.side = 'p2';
  }
  // Devuelve la próxima acción que quiere enviar al motor, o null si no tiene nada que hacer.
  nextAction(state) {
    const side = this.side;
    const view = getView(state, side); // sólo información visible para el rival
    if (state.phase === 'duel_roll' || (state.phase === 'duel_pick' && !state.duel.revealed)) {
      const key = `${state.round}-${state.duelIndex}`;
      if (this.desarmeKey !== key && legalActions(state, side).desarme && shouldUseDesarme(view)) {
        this.desarmeKey = key;
        return { type: 'USE_DESARME', player: side };
      }
    }
    if (state.phase === 'duel_pick' && !state.duel.locked[side]) {
      const uid = chooseCard(view, this.level);
      return uid ? { type: 'PLAY_CARD', player: side, uid } : null;
    }
    if (state.phase === 'duel_choice') {
      const choice = state.duel.pendingChoices.find((c) => c.player === side);
      if (choice) return { type: 'RESOLVE_CHOICE', player: side, id: choice.id, ...decideChoice(view, choice) };
    }
    return null;
  }
}

export class GameController {
  constructor(onChange) {
    this.onChange = onChange;
    this.state = null;
    this.gen = 0;
    this.fx = [];
    this.busy = false;
  }

  start({ deck, level = 'normal', seed, arrangement, dieMods }) {
    this.gen += 1;
    const s = seed ?? newSeed();
    const rng = { rngState: (s ^ 0x9e3779b9) >>> 0 };
    this.opponent = new AIOpponent(AI_LEVELS[level] || AI_LEVELS.normal);
    const foeDeck = randomValidDeck(rng);
    // El rival Normal reparte sus Rounds con la misma lógica que la sugerencia; el Fácil lo deja al azar.
    const foeArr = level === 'easy' ? undefined : suggestArrangement(foeDeck);
    this.state = createGame({
      seed: s,
      decks: { p1: deck, p2: foeDeck },
      names: { p1: 'Vos', p2: 'Rival' },
      dieMods: dieMods ? { p1: dieMods } : {},
      arrangements: { ...(arrangement ? { p1: arrangement } : {}), ...(foeArr ? { p2: foeArr } : {}) },
    });
    this.fx = ['round'];
    this.emit();
    this.pump();
  }

  stop() {
    this.gen += 1;
    this.state = null;
  }

  view() {
    return getView(this.state, 'p1');
  }

  emit() {
    const fx = this.fx;
    this.fx = [];
    this.onChange(fx);
  }

  // Acción del jugador humano (p1). Devuelve { ok, error }.
  submit(action) {
    if (!this.state) return { ok: false, error: 'No hay partida en curso.' };
    const before = this.state.phase;
    const res = dispatch(this.state, { ...action, player: 'p1' });
    if (!res.ok) return res;
    this.noteFx(action, before);
    this.emit();
    this.pump();
    return res;
  }

  noteFx(action, before) {
    if (action.type === 'ROLL') { this.fx.push('roll'); this.lastRollAt = Date.now(); }
    if (before === 'duel_pick' && this.state.duel && this.state.duel.revealed) this.fx.push('reveal');
    if (this.state.phase === 'round_intro') this.fx.push('round');
  }

  // Deja que el oponente actúe cuando le corresponde, con pausas para que se pueda seguir la partida.
  async pump() {
    if (this.pumping) { this.again = true; return; }
    this.pumping = true;
    const gen = this.gen;
    try {
      do {
        this.again = false;
        await this.pumpOnce(gen);
      } while (this.again && gen === this.gen);
    } finally {
      this.pumping = false;
    }
  }

  async pumpOnce(gen) {
    for (let guard = 0; guard < 8; guard++) {
      if (gen !== this.gen || !this.state) return;
      const s = this.state;
      let delay = 500;
      if (s.phase === 'duel_pick' && s.duel.locked.p1 && !s.duel.locked.p2) delay = 900;
      if (s.phase === 'duel_pick' && !s.duel.locked.p1) delay = 700;
      const action = this.opponent.nextAction(s);
      if (!action) return;
      // Tras una tirada se espera a que termine la animación del dado antes de que el rival actúe.
      const sinceRoll = Date.now() - (this.lastRollAt || 0);
      if (sinceRoll < 2400) delay = Math.max(delay, 2400 - sinceRoll);
      await sleep(delay);
      if (gen !== this.gen || !this.state) return;
      const before = this.state.phase;
      const res = dispatch(this.state, action);
      if (!res.ok) return;
      this.noteFx(action, before);
      this.emit();
    }
  }
}
