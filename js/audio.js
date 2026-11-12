// Sonido del juego: música ambiental en bucle y efectos. Se activa con el primer toque (regla de los navegadores/WebView).
import { Synth } from './audio/synth.js';
import { RESULT_DELAY_MS } from './data/constants.js';
import { AUDIO_FILES } from './audio/manifest.js';
import { getPrefs, setPrefs } from './settings.js';

const EFFECT_NAMES = ['tap', 'select', 'deselect', 'zoom', 'play', 'flip', 'throw', 'duelWin', 'duelLose', 'duelTie', 'roundIntro', 'roundWin', 'roundLose', 'gameWin', 'gameLose', 'error'];

export const Sound = {
  ctx: null, synth: null, musicGain: null, sfxGain: null, timer: null, nextBar: 0, bar: 0, started: false,
  files: {}, musicEl: null, last: { key: '', wins: 0 },

  prefs() {
    const p = getPrefs();
    return { musicOn: p.musicOn !== false, sfxOn: p.sfxOn !== false, musicVol: p.musicVol ?? 0.6, sfxVol: p.sfxVol ?? 0.8 };
  },

  // Se llama desde un toque del usuario.
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.musicGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        const comp = this.ctx.createDynamicsCompressor();
        this.musicGain.connect(comp); this.sfxGain.connect(comp); comp.connect(this.ctx.destination);
        this.synth = new Synth(this.ctx, this.musicGain, this.sfxGain);
        this.apply();
        this.loadFiles();
        document.addEventListener('visibilitychange', () => this.visibility());
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.startMusic();
    } catch { /* sin audio: el juego sigue igual */ }
  },

  visibility() {
    if (!this.ctx) return;
    if (document.hidden) { this.ctx.suspend(); if (this.musicEl) this.musicEl.pause(); }
    else { this.ctx.resume(); if (this.musicEl && this.prefs().musicOn) this.musicEl.play().catch(() => {}); }
  },

  apply() {
    if (!this.ctx) return;
    const p = this.prefs();
    const now = this.ctx.currentTime;
    this.musicGain.gain.setTargetAtTime(p.musicOn ? p.musicVol * 0.55 : 0, now, 0.05);
    this.sfxGain.gain.setTargetAtTime(p.sfxOn ? p.sfxVol : 0, now, 0.02);
    if (this.musicEl) this.musicEl.volume = p.musicOn ? Math.min(1, p.musicVol) : 0;
  },

  set(patch) { setPrefs(patch); this.apply(); },

  async loadFiles() {
    for (const [name, url] of Object.entries(AUDIO_FILES.sfx || {})) {
      try {
        const buf = await (await fetch(url)).arrayBuffer();
        this.files[name] = await this.ctx.decodeAudioData(buf);
      } catch { /* si falta el archivo se usa el sonido generado */ }
    }
    if (AUDIO_FILES.music) {
      this.musicEl = new Audio(AUDIO_FILES.music);
      this.musicEl.loop = true;
      this.apply();
      this.startMusic();
    }
  },

  startMusic() {
    if (!this.ctx || this.started) return;
    if (AUDIO_FILES.music) {
      if (this.musicEl) { this.started = true; this.musicEl.play().catch(() => { this.started = false; }); }
      return;
    }
    this.started = true;
    this.nextBar = this.ctx.currentTime + 0.3;
    const tick = () => {
      while (this.nextBar < this.ctx.currentTime + 1.6) {
        this.synth.scheduleBar(this.bar, this.nextBar);
        this.bar += 1;
        this.nextBar += Synth.BAR;
      }
    };
    tick();
    this.timer = setInterval(tick, 250);
  },

  // Efecto con retardo opcional (segundos).
  fx(name, delay = 0) {
    try {
      if (!this.ctx || !this.prefs().sfxOn) return;
      if (this.ctx.state === 'suspended') return;
      const t = this.ctx.currentTime + delay + 0.01;
      const buf = this.files[name];
      if (buf) { const s = this.ctx.createBufferSource(); s.buffer = buf; s.connect(this.sfxGain); s.start(t); return; }
      this.synth.sfx(name, t);
    } catch { /* ignorar */ }
  },

  // Sonidos según lo que pasó en la partida.
  react(view, fx = []) {
    if (!view) return;
    const l = this.last;
    if (fx.includes('reveal')) this.fx('flip');
    if (fx.includes('round') && view.phase === 'round_intro') this.fx('roundIntro');
    const key = `${view.round}-${view.duelIndex}-${view.phase}`;
    if (key === l.key) return;
    l.key = key;
    if (view.phase === 'duel_result' && view.duel && view.duel.resolution) {
      const w = view.duel.resolution.winner;
      this.fx(w === 'p1' ? 'duelWin' : w === 'p2' ? 'duelLose' : 'duelTie', fx.includes('reveal') ? RESULT_DELAY_MS / 1000 : 0.1); // acompaña al cartel de resultado
    } else if (view.phase === 'round_result') {
      this.fx(view.roundWins.p1 > l.wins ? 'roundWin' : 'roundLose', 0.2);
    } else if (view.phase === 'game_over') {
      this.fx(view.winner === 'p1' ? 'gameWin' : 'gameLose', 0.3);
    }
    if (view.roundWins) l.wins = view.roundWins.p1;
  },

  resetGame() { this.last = { key: '', wins: 0 }; },
};

export { EFFECT_NAMES };
