// Tutorial guiado: una partida de práctica con globos de ayuda que aparecen según el momento del duelo.
// Cada paso se muestra cuando se cumple `when` y se resuelve solo (auto) o con el botón "Entendido".
import { ATTR_NAMES } from '../data/constants.js';
import { esc } from './util.js';
import { t } from '../i18n.js';

const STEPS = [
  { id: 'intro', when: (v) => v.phase === 'round_intro' && v.round === 1, text: () => t('¡Bienvenido! Ganás la partida si ganás 2 de las 3 Rondas. Cada Ronda tiene 3 duelos y un Escenario con un efecto especial: lo ves en esta pantalla.'), pos: 'top' },
  { id: 'play', auto: true, when: (v) => v.phase === 'round_intro' && v.round === 1, text: () => t('Tus 3 cartas de esta Ronda ya están en tu mano. Tocá ¡A jugar!'), target: '.sheet .btn', pos: 'top' },
  { id: 'roll', auto: true, when: (v, ui) => v.phase === 'duel_roll' && v.round === 1 && v.duelIndex === 0 && !ui.throwOpen, text: () => t('Primero se tira el dado: decide con qué atributo se compara el duelo. Tocá Tirar dado.'), target: '.mainbtn', pos: 'top' },
  { id: 'pick', auto: true, when: (v, ui) => v.phase === 'duel_pick' && v.round === 1 && v.duelIndex === 0 && !v.duel.locked.p1 && !ui.selected && !ui.throwOpen, text: (v) => t('Salió {attr}. Gana quien tenga el valor más alto en ese atributo. Elegí una carta de tu mano: el número resaltado es el que cuenta.', { attr: ATTR_NAMES[v.duel.attr] }), target: '.b-hand', pos: 'top' },
  { id: 'confirm', auto: true, when: (v, ui) => v.phase === 'duel_pick' && v.round === 1 && v.duelIndex === 0 && !v.duel.locked.p1 && !!ui.selected, text: () => t('Tocá la lupa de la carta para verla grande. Cuando estés seguro, tocá Jugar: el rival juega la suya a la vez y se revelan juntas.'), target: '.mainbtn', pos: 'top' },
  { id: 'result', when: (v, ui) => v.phase === 'duel_result' && v.round === 1 && v.duelIndex === 0 && !ui.hideResult, text: () => t('Acá ves por qué ganaste o perdiste: los números finales ya incluyen las habilidades de las cartas y el Escenario. Con Ver mesa podés mirar el tablero.'), pos: 'top' },
  { id: 'zones', when: (v, ui) => v.phase === 'duel_roll' && v.round === 1 && v.duelIndex === 1 && !ui.throwOpen, text: () => t('Abajo ves tu Reserva, tu Descarte, tus Mazos y tus Efectos Activos: tocá cualquiera para ver qué tiene. La Ronda termina apenas alguien gana 2 duelos, así que pensá bien en qué orden jugás tus 3 cartas.'), target: '.dock-hd', pos: 'top' },
  { id: 'roundend', when: (v) => v.phase === 'round_result' && v.round === 1, text: () => t('Se terminó la Ronda 1: se la lleva quien ganó más duelos. ¡Vamos por la segunda!'), pos: 'top' },
  { id: 'finish', finish: true, when: (v) => v.phase === 'round_intro' && v.round === 2, text: () => t('¡Listo, ya sabés lo básico! Seguí jugando esta partida. En Cómo se juega están todas las reglas y en Configuración podés cambiar la dificultad.'), pos: 'top' },
];

export function newTutorial() {
  return { on: true, done: {}, seen: {} };
}

function current(v, ui) {
  const tut = ui.tut;
  if (!tut || !tut.on) return null;
  for (const s of STEPS) {
    if (tut.done[s.id]) continue;
    if (s.when(v, ui)) { tut.seen[s.id] = true; return s; }
    if (s.auto && tut.seen[s.id]) tut.done[s.id] = true;
  }
  return null;
}

export function coachHTML(v, ui) {
  const s = current(v, ui);
  ui.tutStep = s || null;
  if (!s) return '';
  const btn = s.auto ? '' : `<button class="co-ok" data-action="tutnext">${esc(t('Entendido'))}</button>`;
  return `<div class="coach ${s.pos === 'bottom' ? 'bottom' : ''}" role="status"><p>${esc(s.text(v))}</p><div class="co-row"><button class="co-skip" data-action="tutskip">${esc(t('Saltar tutorial'))}</button>${btn}</div></div>`;
}

// Resalta el elemento al que apunta el paso actual (después de dibujar la pantalla).
export function coachAfterRender(app, ui) {
  app.querySelectorAll('.coach-hl').forEach((n) => n.classList.remove('coach-hl'));
  const s = ui.tutStep;
  if (!s || !s.target) return;
  const el = app.querySelector(s.target);
  if (el) el.classList.add('coach-hl');
}

export function tutorialAction(action, ui, ctx) {
  const tut = ui.tut;
  if (action === 'tutnext') {
    if (ui.tutStep) {
      tut.done[ui.tutStep.id] = true;
      if (ui.tutStep.finish) tut.on = false;
    }
    ctx.rerender(true);
    return true;
  }
  if (action === 'tutskip') {
    if (tut) tut.on = false;
    ctx.rerender(true);
    return true;
  }
  return false;
}
