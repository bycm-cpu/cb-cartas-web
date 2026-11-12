// Sonido generado con Web Audio: música de aventura en bucle (estilo cómic/arcade) y efectos. No usa archivos ni material con derechos.
// Todas las funciones reciben un contexto y un destino, así se puede renderizar también sin conexión (pruebas).

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export function makeNoise(ctx) {
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let s = 12345;
  for (let i = 0; i < len; i++) { s = (s * 1664525 + 1013904223) >>> 0; d[i] = (s / 4294967296) * 2 - 1; }
  return buf;
}

export class Synth {
  constructor(ctx, musicDest, sfxDest) {
    this.ctx = ctx;
    this.musicDest = musicDest;
    this.sfxDest = sfxDest;
    this.noise = makeNoise(ctx);
    // Eco suave para las notas de la música.
    this.echo = ctx.createDelay(1);
    this.echo.delayTime.value = 0.375; // corchea con puntillo a 120 bpm
    const fb = ctx.createGain(); fb.gain.value = 0.32;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    const wet = ctx.createGain(); wet.gain.value = 0.35;
    this.echoIn = ctx.createGain();
    this.echoIn.connect(this.echo); this.echo.connect(lp); lp.connect(fb); fb.connect(this.echo); lp.connect(wet); wet.connect(musicDest);
  }

  tone(dest, f, t, dur, { type = 'sine', gain = 0.2, attack = 0.005, release = 0.06, to = null, filter = null, detune = 0 } = {}) {
    const c = this.ctx;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.setValueAtTime(gain, Math.max(t + attack, t + dur - release));
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    let out = g;
    if (filter) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = filter; o.connect(fl); fl.connect(g); } else o.connect(g);
    g.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
    return out;
  }

  hit(dest, t, dur, { type = 'bandpass', f = 1500, to = null, q = 1, gain = 0.2, attack = 0.002 } = {}) {
    const c = this.ctx;
    const s = c.createBufferSource(); s.buffer = this.noise; s.loop = true;
    const fl = c.createBiquadFilter(); fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, t);
    if (to) fl.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(dest);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }

  // ------------------------------------------------------------------ instrumentos
  // Metal (trompeta/trombón de dibujos animados): dos sierras apenas desafinadas con filtro que se abre al atacar.
  brass(dest, f, t, dur, { gain = 0.12, bright = 3200, dark = 1300, to = null, attack = 0.025, release = 0.08 } = {}) {
    const c = this.ctx;
    const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 1.2;
    fl.frequency.setValueAtTime(dark * 0.5, t);
    fl.frequency.linearRampToValueAtTime(bright, t + 0.06);
    fl.frequency.exponentialRampToValueAtTime(dark, t + Math.max(0.12, dur));
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.setValueAtTime(gain, Math.max(t + attack, t + dur - release));
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    fl.connect(g); g.connect(dest);
    for (const dt of [-9, 9]) {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t); o.detune.value = dt;
      if (to) o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
      o.connect(fl); o.start(t); o.stop(t + dur + 0.05);
    }
    return g;
  }

  kick(dest, t, gain = 0.5) {
    this.tone(dest, 150, t, 0.2, { gain, to: 42, attack: 0.002, release: 0.15 });
    this.hit(dest, t, 0.02, { type: 'highpass', f: 3000, gain: gain * 0.25 });
  }
  snare(dest, t, gain = 0.3) {
    this.hit(dest, t, 0.16, { type: 'bandpass', f: 2100, q: 0.6, gain });
    this.tone(dest, 200, t, 0.1, { type: 'triangle', gain: gain * 0.55, to: 140, attack: 0.002 });
  }
  clap(dest, t, gain = 0.25) {
    for (const o of [0, 0.012, 0.026]) this.hit(dest, t + o, 0.05, { type: 'bandpass', f: 1500, q: 1.1, gain, attack: 0.001 });
    this.hit(dest, t + 0.03, 0.18, { type: 'bandpass', f: 1500, q: 0.8, gain: gain * 0.5 });
  }
  hat(dest, t, gain = 0.06, open = false) {
    this.hit(dest, t, open ? 0.13 : 0.035, { type: 'highpass', f: 7000, gain, attack: 0.001 });
  }
  // Golpe de cómic (“¡POW!”): impacto grave + chasquido.
  pow(dest, t, gain = 0.5) {
    this.tone(dest, 180, t, 0.28, { gain, to: 50, attack: 0.002, release: 0.2 });
    this.hit(dest, t, 0.22, { type: 'lowpass', f: 3500, to: 300, gain: gain * 0.7, attack: 0.001 });
    this.hit(dest, t, 0.03, { type: 'highpass', f: 2500, gain: gain * 0.4, attack: 0.001 });
  }
  cymbal(dest, t, dur = 0.9, gain = 0.1) {
    this.hit(dest, t, dur, { type: 'highpass', f: 5500, gain, attack: 0.004 });
    this.hit(dest, t, dur * 0.6, { type: 'bandpass', f: 9000, q: 0.5, gain: gain * 0.6, attack: 0.004 });
  }

  // ------------------------------------------------------------------ efectos
  sfx(name, t0) {
    const d = this.sfxDest;
    const T = (f, dt, dur, o) => this.tone(d, f, t0 + dt, dur, o);
    const H = (dt, dur, o) => this.hit(d, t0 + dt, dur, o);
    const B = (f, dt, dur, o) => this.brass(d, f, t0 + dt, dur, o);
    switch (name) {
      case 'tap': H(0, 0.03, { type: 'bandpass', f: 2600, q: 2, gain: 0.4 }); T(950, 0, 0.035, { type: 'triangle', gain: 0.2, to: 620, attack: 0.002 }); break;
      case 'select': H(0, 0.05, { type: 'highpass', f: 3500, gain: 0.25 }); T(760, 0, 0.06, { type: 'triangle', gain: 0.2, to: 1100, attack: 0.002 }); break;
      case 'deselect': H(0, 0.05, { type: 'highpass', f: 3000, gain: 0.1 }); T(900, 0, 0.06, { type: 'triangle', gain: 0.1, to: 600, attack: 0.002 }); break;
      case 'zoom': H(0, 0.2, { f: 600, to: 3200, q: 0.9, gain: 0.3, attack: 0.08 }); break;
      // Carta golpeando la mesa.
      case 'play': this.pow(d, t0, 0.42); H(0, 0.05, { type: 'bandpass', f: 1800, q: 1, gain: 0.25 }); break;
      // Carta que se da vuelta: soplido rápido + toque.
      case 'flip': H(0, 0.16, { f: 700, to: 5200, q: 0.9, gain: 0.5, attack: 0.03 }); H(0.15, 0.04, { type: 'bandpass', f: 2200, q: 1.5, gain: 0.35 }); break;
      // Dado de madera rodando: toc-toc cada vez más espaciados y un golpe final.
      case 'throw': {
        let t = 0, gap = 0.04;
        for (let i = 0; i < 14; i++) {
          const g = 0.26 * (1 - i / 20);
          H(t, 0.03, { type: 'bandpass', f: 2200 + Math.random() * 1800, q: 3, gain: g });
          T(520 + Math.random() * 380, t, 0.04, { type: 'triangle', gain: g * 0.55, to: 300, attack: 0.001 });
          t += gap; gap *= 1.14;
        }
        this.pow(d, t0 + t + 0.02, 0.4);
        T(1568, t + 0.1, 0.4, { type: 'triangle', gain: 0.08, release: 0.35 });
        break;
      }
      case 'duelWin': // ¡POW! + remate de metales
        this.pow(d, t0, 0.35);
        B(392, 0.08, 0.12, { gain: 0.1 }); B(523, 0.2, 0.12, { gain: 0.1 }); B(659, 0.32, 0.5, { gain: 0.12 }); B(784, 0.32, 0.5, { gain: 0.09 });
        break;
      case 'duelLose': // trombón triste
        B(262, 0, 0.3, { gain: 0.1, bright: 1500, dark: 700 }); B(247, 0.32, 0.3, { gain: 0.1, bright: 1400, dark: 650 }); B(233, 0.64, 0.3, { gain: 0.1, bright: 1300, dark: 600 });
        B(220, 0.96, 0.8, { gain: 0.11, to: 165, bright: 1300, dark: 550, release: 0.3 });
        break;
      case 'duelTie': T(587, 0, 0.18, { type: 'triangle', gain: 0.2, release: 0.15 }); T(587, 0.2, 0.3, { type: 'triangle', gain: 0.2, release: 0.25 }); H(0, 0.04, { type: 'bandpass', f: 2500, q: 2, gain: 0.15 }); break;
      case 'roundIntro': // redoble que sube + platillo + acorde
        for (let i = 0; i < 12; i++) H(i * 0.045, 0.05, { type: 'bandpass', f: 2000, q: 0.7, gain: 0.05 + i * 0.012, attack: 0.001 });
        this.kick(d, t0 + 0.55, 0.45); this.cymbal(d, t0 + 0.55, 0.8, 0.1);
        B(262, 0.55, 0.5, { gain: 0.09 }); B(330, 0.55, 0.5, { gain: 0.08 }); B(392, 0.55, 0.5, { gain: 0.08 });
        break;
      case 'roundWin': // ta-ta-ta TAAA
        B(523, 0, 0.12, { gain: 0.11 }); B(523, 0.15, 0.12, { gain: 0.11 }); B(523, 0.3, 0.12, { gain: 0.11 }); B(659, 0.45, 0.2, { gain: 0.11 }); B(784, 0.7, 0.9, { gain: 0.12, release: 0.4 });
        B(392, 0.7, 0.9, { gain: 0.08, release: 0.4 }); this.cymbal(d, t0 + 0.7, 0.9, 0.07);
        break;
      case 'roundLose':
        B(330, 0, 0.3, { gain: 0.1, bright: 1500, dark: 700 }); B(294, 0.32, 0.3, { gain: 0.1, bright: 1400, dark: 650 });
        B(262, 0.64, 0.9, { gain: 0.11, to: 196, bright: 1300, dark: 550, release: 0.3 });
        break;
      case 'gameWin': {
        const notes = [[523, 0], [659, 0.14], [784, 0.28], [1047, 0.42]];
        for (const [f, dt] of notes) B(f, dt, 0.16, { gain: 0.11 });
        B(784, 0.7, 0.18, { gain: 0.1 }); B(1047, 0.9, 0.18, { gain: 0.1 });
        for (const f of [523, 659, 784, 1047]) B(f, 1.15, 1.5, { gain: 0.1, release: 0.7 });
        this.kick(d, t0 + 1.15, 0.5); this.cymbal(d, t0 + 1.15, 1.6, 0.1); this.pow(d, t0 + 1.15, 0.3);
        break;
      }
      case 'gameLose':
        B(247, 0, 0.4, { gain: 0.1, bright: 1300, dark: 600 }); B(233, 0.45, 0.4, { gain: 0.1, bright: 1300, dark: 580 }); B(220, 0.9, 0.4, { gain: 0.1, bright: 1200, dark: 560 });
        B(196, 1.35, 1.4, { gain: 0.12, to: 131, bright: 1200, dark: 500, release: 0.5 });
        break;
      case 'error': T(140, 0, 0.1, { type: 'square', gain: 0.08, filter: 600 }); T(110, 0.12, 0.16, { type: 'square', gain: 0.08, filter: 500 }); break;
      default: break;
    }
  }

  // ------------------------------------------------------------------ música
  // Bucle de 8 compases a 120 bpm en Do mayor (C G Am F C G F G): batería suave, bajo funk, acordes cortos a contratiempo
  // y una melodía “de héroe” que aparece una vuelta sí y otra no para que no cansen.
  static get BPM() { return 120; }
  static get BAR() { return (60 / 120) * 4; }
  scheduleBar(index, t) {
    const bar = index % 8;
    const loop = Math.floor(index / 8);
    const e = 60 / 120 / 2; // corchea
    const m = this.musicDest;
    const ROOT = [36, 43, 45, 41, 36, 43, 41, 43];
    const CHORD = [[60, 64, 67], [59, 62, 67], [57, 60, 64], [57, 60, 65], [60, 64, 67], [59, 62, 67], [57, 60, 65], [59, 62, 67]];
    const LEAD = [
      [76, 0, 79, 0, 81, 79, 76, 0], [74, 0, 79, 0, 83, 81, 79, 0], [76, 0, 81, 0, 84, 83, 81, 0], [77, 79, 81, 0, 79, 77, 76, 0],
      [76, 0, 79, 0, 81, 79, 76, 72], [74, 0, 79, 0, 83, 0, 81, 79], [77, 0, 81, 0, 84, 0, 81, 77], [79, 0, 83, 0, 86, 0, 0, 0],
    ];
    const r = ROOT[bar];
    // Batería
    for (const i of [0, 4]) this.kick(m, t + i * e, 0.34);
    if (bar % 2 === 1) this.kick(m, t + 5 * e, 0.2);
    for (const i of [2, 6]) this.snare(m, t + i * e, 0.15);
    for (let i = 0; i < 8; i++) this.hat(m, t + i * e, i % 2 ? 0.035 : 0.02, false);
    if (bar === 7) { for (let i = 0; i < 4; i++) this.snare(m, t + (6 + i * 0.5) * e, 0.07 + i * 0.03); this.cymbal(m, t + 8 * e - 0.02, 0.2, 0.0); }
    if (bar === 0 && loop > 0) this.cymbal(m, t, 1.2, 0.05);
    // Bajo
    const bassPat = [[0, r, 1.6], [2, r, 0.8], [3, r + 12, 0.6], [4, r, 1.6], [6, r + 7, 0.8], [7, r + 5, 0.6]];
    for (const [i, n, d] of bassPat) this.tone(m, mtof(n), t + i * e, d * e, { type: 'sawtooth', gain: 0.1, filter: 520, attack: 0.008, release: 0.05 });
    // Acordes cortos a contratiempo
    for (const i of [3, 7]) for (const n of CHORD[bar]) this.tone(m, mtof(n), t + i * e, e * 0.9, { type: 'sawtooth', gain: 0.022, filter: 1700, attack: 0.006, release: 0.08 });
    // Melodía (vueltas pares) con eco
    if (loop % 2 === 0) {
      LEAD[bar].forEach((n, i) => {
        if (!n) return;
        const g = this.tone(m, mtof(n), t + i * e, e * 1.6, { type: 'square', gain: 0.03, filter: 2400, attack: 0.01, release: 0.12 });
        g.connect(this.echoIn);
      });
    } else if (bar % 2 === 0) {
      // Vueltas impares: sólo un campanilleo suave sobre el acorde para variar.
      const n = CHORD[bar][2] + 12;
      const g = this.tone(m, mtof(n), t + 4 * e, e * 3, { type: 'triangle', gain: 0.05, attack: 0.01, release: 0.4 });
      g.connect(this.echoIn);
    }
  }
}
