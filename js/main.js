// Arranque, navegación y delegación de eventos.
import { menu, rules, collection, setup, settings } from './ui/screens.js';
import { t } from './i18n.js';
import { game } from './ui/board.js';
import { arrange } from './ui/arrange.js';
import { adventure, getRun, saveRun } from './ui/adventure.js';
import { shop } from './ui/shop.js';
import { initCardFit } from './ui/fit.js';
import { finishFight, fightLevel, reward } from './adventure.js';
import { addCoins, addGems, inventory, saveLeftovers, GEMS_ADVENTURE_WIN } from './profile.js';
import { GameController } from './controller.js';
import { getPrefs, setPrefs } from './settings.js';
import { cardHTML } from './ui/card.js';
import { cardDef } from './engine/catalog.js';
import { esc } from './ui/util.js';
import { Sound } from './audio.js';
import { setLang } from './i18n.js';
import { newTutorial } from './ui/tutorial.js';
import { EXAMPLE_DECK } from './engine/deck.js';
import { suggestArrangement } from './engine/arrange.js';

setLang(getPrefs().lang || 'es');
const app = document.getElementById('app');
const screens = { menu, rules, collection, setup, settings, game, arrange, adventure, shop };
let current = 'menu';
let lastFx = [];

const layer = document.createElement('div');
layer.className = 'top-layer';
document.body.appendChild(layer);

const controller = new GameController((fx) => {
  lastFx = fx;
  if (current === 'game') { Sound.react(controller.state ? controller.view() : null, fx); render(); }
});

const ctx = {
  controller,
  lastDeck: null,
  go,
  rerender: () => render(),
  toast,
  startGame,
  mode: null,
  adventureDone,
};

// Partida suelta contra la IA terminada: se pagan las monedas una sola vez y se guardan las mejoras de dado que sobraron.
function payIfOver() {
  if (current !== 'game' || !game.ui.perm || game.ui.paid || !controller.state) return;
  const v = controller.view();
  if (v.phase !== 'game_over') return;
  game.ui.paid = true;
  game.ui.earned = reward(v.winner === 'p1', v.roundWins.p1);
  addCoins(game.ui.earned);
  saveLeftovers(v.dieMods ? v.dieMods.p1 : null);
}

function render() {
  const scroller = app.querySelector('.scroll');
  const top = scroller ? scroller.scrollTop : 0;
  const hand = app.querySelector('.b-log-scroll');
  void hand;
  payIfOver();
  app.innerHTML = screens[current].render(ctx, lastFx);
  lastFx = [];
  const sc = app.querySelector('.scroll');
  if (sc && scroller) sc.scrollTop = top;
  if (screens[current].afterRender) screens[current].afterRender(app);
}

function go(name, { push = true } = {}) {
  if (name === 'menu' || name === 'setup') ctx.mode = null;
  if (current === 'game' && name !== 'game') {
    if (game.ui.perm && controller.state) { const v = controller.view(); saveLeftovers(v.dieMods ? v.dieMods.p1 : null); }
    controller.stop();
  }
  current = name;
  if (screens[name].enter) screens[name].enter();
  if (push) {
    try { history.pushState({ screen: name }, ''); } catch { /* sin historial */ }
  }
  render();
  const sc = app.querySelector('.scroll');
  if (sc) sc.scrollTop = 0;
}

function startGame(deck, arrangement) {
  Sound.resetGame();
  ctx.lastDeck = deck;
  ctx.lastArrangement = arrangement || null;
  game.reset();
  const adv = ctx.mode === 'adventure' ? getRun() : null;
  game.ui.adv = !!adv;
  game.ui.perm = !adv; game.ui.paid = false; game.ui.earned = 0;
  controller.start({ deck, level: adv ? fightLevel(adv) : getPrefs().aiLevel, arrangement, dieMods: adv ? { ...adv.mods } : { ...inventory() } });
  go('game');
}

// Cierra un combate de la Aventura (resultado o abandono) y vuelve al panel de la carrera.
function adventureDone({ won, roundsWon, modsLeft }) {
  const run = getRun();
  if (!run) { go('menu'); return; }
  const r = finishFight(run, { won, roundsWon, modsLeft });
  saveRun(run);
  addCoins(r.coins); // también suman al perfil permanente
  if (r.over === 'victory') addGems(GEMS_ADVENTURE_WIN);
  adventure.nextMsg = won ? t('¡Combate ganado! +{n} monedas.', { n: r.coins }) : t('Combate perdido: -1 vida, +{n} monedas.', { n: r.coins });
  go('adventure');
}

function startTutorial() {
  ctx.mode = null;
  Sound.resetGame();
  game.reset();
  game.ui.tut = newTutorial();
  const deck = EXAMPLE_DECK.slice();
  ctx.lastDeck = deck;
  ctx.lastArrangement = null;
  controller.start({ deck, level: 'easy', seed: 20241, arrangement: suggestArrangement(deck) });
  setPrefs({ tutorialDone: true });
  go('game');
}

let toastTimer = null;
function toast(msg) {
  layer.querySelectorAll('.toast').forEach((n) => n.remove());
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  layer.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), 2600);
}

function showDetail(num) {
  const def = cardDef(Number(num));
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="detail-wrap">${cardHTML(def, { variant: 'full' })}<button class="btn" data-close="1"><span>${t('Cerrar')}</span></button></div>`;
  ov.addEventListener('click', () => { hideTip(); ov.remove(); });
  layer.appendChild(ov);
}

// --- Eventos ---------------------------------------------------------------------------
// El audio sólo puede arrancar después de un toque del usuario.
window.addEventListener('pointerdown', () => Sound.unlock(), { capture: true });
app.addEventListener('input', (e) => {
  const el = e.target.closest('[data-range]');
  if (!el) return;
  Sound.set({ [el.dataset.range]: Number(el.value) / 100 });
});
app.addEventListener('change', (e) => {
  const el = e.target.closest('[data-range]');
  if (el && el.dataset.range === 'sfxVol') Sound.fx('select');
});
let suppressClick = false;
let pressTimer = null;

app.addEventListener('pointerdown', (e) => {
  const t = e.target.closest('[data-num].pick, .hc[data-num]');
  if (!t) return;
  clearTimeout(pressTimer);
  pressTimer = setTimeout(() => {
    suppressClick = true;
    setTimeout(() => (suppressClick = false), 400);
    showDetail(t.dataset.num);
  }, 500);
});
for (const ev of ['pointerup', 'pointercancel', 'pointerleave', 'pointermove']) {
  app.addEventListener(ev, (e) => {
    if (ev === 'pointermove' && Math.abs(e.movementX) + Math.abs(e.movementY) < 4) return;
    clearTimeout(pressTimer);
  });
}
app.addEventListener('contextmenu', (e) => e.preventDefault());

// Tooltips: tocar un [data-tip] muestra una burbuja con la explicación (captura: va antes que los overlays).
let tipEl = null, tipTimer = null;
function hideTip() { if (tipEl) { tipEl.remove(); tipEl = null; } clearTimeout(tipTimer); }
window.addEventListener('click', (e) => {
  const el = e.target.closest && e.target.closest('[data-tip]');
  if (!el) { hideTip(); return; }
  e.stopPropagation(); e.preventDefault();
  const same = tipEl && tipEl._src === el;
  hideTip();
  if (same) return;
  tipEl = document.createElement('div');
  tipEl.className = 'tip-pop';
  tipEl._src = el;
  tipEl.textContent = el.dataset.tip;
  layer.appendChild(tipEl);
  const r = el.getBoundingClientRect();
  const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  const left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2));
  let top = r.top - h - 8;
  if (top < 8) top = r.bottom + 8;
  tipEl.style.left = left + 'px'; tipEl.style.top = top + 'px';
  tipTimer = setTimeout(hideTip, 6000);
}, true);

app.addEventListener('click', (e) => {
  if (suppressClick) { e.preventDefault(); e.stopPropagation(); return; }
  const el = e.target.closest('[data-action]');
  if (!el || !app.contains(el)) return;
  const action = el.dataset.action;
  const SFX = { select: 'select', confirm: 'play', peek: 'zoom', zoom: 'zoom', throwtap: null, hideresult: null, closeoverlay: 'deselect' };
  const sfx = action in SFX ? SFX[action] : 'tap';
  if (sfx) Sound.fx(sfx);
  if (action === 'go') { go(el.dataset.to); return; }
  if (action === 'tutorial') { startTutorial(); return; }
  if (action === 'detail') { showDetail(el.dataset.num); return; }
  const screen = screens[current];
  if (screen.onAction && screen.onAction(action, el, ctx)) return;
});

window.addEventListener('popstate', () => {
  if (current === 'game') {
    // El botón Atrás durante la partida pide confirmación en vez de salir.
    game.ui.overlay = { type: 'quit' };
    try { history.pushState({ screen: 'game' }, ''); } catch { /* ignorar */ }
    render();
  } else if (current !== 'menu') {
    go('menu', { push: false });
  }
});

try { history.replaceState({ screen: 'menu' }, ''); } catch { /* ignorar */ }
initCardFit();
window.__cb = { controller, ctx, go, startGame }; // utilidad de depuración
render();
void esc;

// Intro animada (ver css/intro.css): dura ~2,8 s; tocar la pantalla la saltea. El juego ya está dibujado detrás.
const boot = document.getElementById('boot');
if (boot) {
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    boot.classList.add('out');
    setTimeout(() => boot.remove(), 600);
  };
  boot.addEventListener('click', finish); // con 'click' (no 'pointerdown') el mismo toque no activa el botón que queda debajo
  setTimeout(finish, 2800);
}
