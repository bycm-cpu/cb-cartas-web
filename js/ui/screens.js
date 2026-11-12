// Pantallas simples: menú, reglas, colección, preparación de partida (mazo) y configuración.
import { CARDS, CARD_BY_NUM, PENDING_CARDS } from '../data/cards.js';
import { SCENARIOS, PENDING_SCENARIOS } from '../data/scenarios.js';
import { RULES } from '../data/constants.js';
import { validateDeck, EXAMPLE_DECK, randomValidDeck } from '../engine/deck.js';
import { newSeed } from '../engine/rng.js';
import { AI_LEVELS } from '../engine/ai.js';
import { getPrefs, setPrefs, savedDeckOrExample } from '../settings.js';
import { scenarioCardHTML, cardHTML } from './card.js';
import { ownedCards } from '../profile.js';
import { esc, pad3 } from './util.js';
import { ICON } from './icons.js';
import { header } from './chrome.js';
import { arrange } from './arrange.js';
import { Sound } from '../audio.js';
import { t, td, getLang, setLang, LANGS } from '../i18n.js';

const topbar = (title, back = 'menu') => header({ title: t(title), back });

export const VERSION = '0.20.2';

// ---------------------------------------------------------------- Menú
export const menu = {
  render() {
    const cards = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"><rect x="6" y="9" width="21" height="30" rx="3" transform="rotate(-12 16 24)"/><rect x="20" y="9" width="21" height="30" rx="3" transform="rotate(10 30 24)"/><path d="M26 18l1.6 3.4 3.6.4-2.7 2.5.8 3.6-3.3-1.9-3.2 1.9.7-3.6-2.6-2.5 3.6-.4z" fill="currentColor" stroke="none" transform="rotate(10 30 24)"/></svg>';
    const person = '<svg viewBox="0 0 48 48" fill="currentColor"><circle cx="24" cy="15" r="9"/><path d="M6 43c0-10 8-16 18-16s18 6 18 16z"/></svg>';
    const tag = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"><path d="M6 24V8a2 2 0 0 1 2-2h16l18 18-18 18z"/><circle cx="15" cy="15" r="3" fill="currentColor" stroke="none"/></svg>';
    const gear = '<svg viewBox="0 0 48 48" fill="currentColor"><path d="M20 3h8l1.2 5.4a16 16 0 0 1 4 2.3l5.2-1.8 4 6.9-4.1 3.6a16 16 0 0 1 0 4.6l4.1 3.6-4 6.9-5.2-1.8a16 16 0 0 1-4 2.3L28 45h-8l-1.2-5.4a16 16 0 0 1-4-2.3l-5.2 1.8-4-6.9 4.1-3.6a16 16 0 0 1 0-4.6L5.6 20.4l4-6.9 5.2 1.8a16 16 0 0 1 4-2.3z"/><circle cx="24" cy="24" r="6.5" fill="#f2e6c6"/></svg>';
    return `<div class="screen menu">
      <div class="m-logo"><img src="assets/brand/logo.png" alt="${t('Capitán Barato · Juego de cartas coleccionables')}"></div>
      <div class="m-stack">
        <button class="mbtn m-red" data-action="go" data-to="setup"><i>${cards}</i><span>${t(`Jugar`)}</span></button>
        <button class="mbtn m-yellow" data-action="go" data-to="adventure"><i>${cards}</i><span>${t(`Aventura`)}</span></button>
        <button class="mbtn m-cream" data-action="go" data-to="collection"><i>${person}</i><span>${t(`Mi colección`)}</span></button>
        <button class="mbtn m-red" data-action="go" data-to="shop"><i>${tag}</i><span>${t(`Tienda`)}</span></button>
        <button class="mbtn m-yellow" data-action="go" data-to="settings"><i>${gear}</i><span>${t(`Configuración`)}</span></button>
        <button class="m-link" data-action="tutorial">${getPrefs().tutorialDone ? '' : '★ '}${t(`Tutorial`)}</button>
        <button class="m-link" data-action="go" data-to="rules">${t(`Cómo se juega`)}</button>
      </div>
    </div>`;
  },
};

// ---------------------------------------------------------------- Reglas
export const rules = {
  render() {
    return `<div class="screen">${topbar('Reglas')}
    <div class="scroll">
      <div class="panel"><h3>${t(`Objetivo`)}</h3>
        <p>${t(`Ganá <b>2 de las 3 Rondas</b>. Cada Ronda tiene <b>3 duelos</b> entre tus personajes y los del rival.`)}</p></div>
      <div class="panel"><h3>${t(`Preparación`)}</h3>
        <ul>
          <li>${t('Cada jugador arma un mazo de <b>{n} personajes</b>.', { n: RULES.deckSize })}</li>
          <li>${t(`Repartís tus cartas en <b>9 para la Reserva</b> y <b>3 Mazos Activos</b> de 3 cartas, uno por Ronda. El juego te sugiere un reparto y lo podés cambiar (pantalla <i>Armá tus Rondas</i>). El rival reparte solo.`)}</li>
          <li>${t(`En cada Ronda llevás a tu mano las 3 cartas de su Mazo Activo y las jugás en el orden que quieras.`)}</li>
          <li>${t(`Las cartas de la Reserva no se juegan: solo entran si una habilidad (como la de Medium) las intercambia.`)}</li>
          <li>${t(`Hay un <b>Escenario</b> por Ronda con un efecto especial.`)}</li>
        </ul></div>
      <div class="panel"><h3>${t(`Un duelo`)}</h3>
        <ol style="margin:6px 0 0;padding-left:22px">
          <li style="margin:4px 0">${t(`Tirás el <b>dado</b> deslizándolo con el dedo: 1 Fuerza · 2 Inteligencia · 3 Velocidad · 4 Resistencia · 5 Agilidad · 6 Carisma.`)}</li>
          <li style="margin:4px 0">${t(`Cada jugador elige <b>en secreto</b> un personaje de su mano y se revelan a la vez.`)}</li>
          <li style="margin:4px 0">${t(`Se aplican habilidades, Efectos Activos y el escenario (bonificaciones y penalizaciones).`)}</li>
          <li style="margin:4px 0">${t(`Gana el <b>valor más alto</b> del atributo sorteado (salvo que un efecto diga otra cosa).`)}</li>
        </ol></div>
      <div class="panel"><h3>${t(`Empates`)}</h3>
        <p>${t(`Se vuelve a tirar el dado y se compara <b>otro atributo</b>. Si todo empata ("empate absoluto"), cada jugador toma la carta superior de su Reserva y se enfrentan en el último atributo sorteado; gana la Ronda quien tenga el mayor valor. Sin cartas, se define con el dado.`)}</p></div>
      <div class="panel"><h3>${t(`Descarte y Efectos Activos`)}</h3>
        <ul>
          <li>${t(`Las cartas jugadas van al <b>descarte</b>; las que sobran en la mano vuelven al fondo de la Reserva al final de la Ronda.`)}</li>
          <li>${t(`Algunos personajes tienen un <b>Efecto Activo</b>: al salir del duelo van a esa zona en vez del descarte y su efecto vale para los duelos siguientes. Activar otro efecto descarta el anterior (los <i>Team Up</i> se acumulan entre sí).`)}</li>
          <li>${t(`Si no tenés cartas para jugar un duelo, lo gana el rival.`)}</li>
          <li>${t(`Las cartas usan la palabra <i>Round</i> para referirse a la Ronda.`)}</li>
        </ul></div>
    </div></div>`;
  },
};

// ---------------------------------------------------------------- Colección
export const collection = {
  state: { tab: 'cards' },
  render() {
    const tab = this.state.tab;
    const tabs = `<div class="tabs"><button class="${tab === 'cards' ? 'on' : ''}" data-action="tab" data-tab="cards">${t(`Personajes`)}</button><button class="${tab === 'scn' ? 'on' : ''}" data-action="tab" data-tab="scn">${t(`Escenarios`)}</button></div>`;
    let body;
    if (tab === 'cards') {
      const ok = CARDS.slice().sort((a, b) => a.num - b.num);
      body = `<div class="grid">${ok.map((d) => `<button class="pick" data-action="detail" data-num="${d.num}" style="background:none;border:0;padding:0">${cardHTML(d, { variant: 'hand' })}</button>`).join('')}</div>
        <h3 class="sub-h" style="margin:22px 0 6px;color:var(--yellow)">${t('En preparación ({n})', { n: PENDING_CARDS.length })}</h3>
        <div class="grid" style="margin-top:10px">${PENDING_CARDS.map((d) => `<div class="card v-mini t-urbano locked-card"><div class="c-name"><span>${esc(d.name)}</span></div><div class="c-art noart"><span class="ph">${t(`Pendiente`)}</span></div><div class="c-mini-foot"><span>${t(`Nº`)} ${pad3(d.num)}</span></div></div>`).join('')}</div>`;
    } else {
      body = `<div class="scn-grid">${SCENARIOS.map((s) => `<div class="scn-card">${scenarioCardHTML(s, { variant: 'art' })}<div class="tx"><div class="pv">${esc(s.province)} · ${esc(td(s.type))}</div><div class="ef">${esc(td(s.text))}</div></div></div>`).join('')}</div>
        <h3 class="sub-h" style="margin:22px 0 6px;color:var(--yellow)">${t('En preparación ({n})', { n: PENDING_SCENARIOS.length })}</h3>
        <ul style="padding-left:18px;font-size:.92rem;opacity:.85">${PENDING_SCENARIOS.map((s) => `<li><b>${esc(s.name)}</b>: ${esc(td(s.reason))}</li>`).join('')}</ul>`;
    }
    return `<div class="screen">${topbar('Colección')}${tabs}<div class="scroll">${body}</div></div>`;
  },
  onAction(action, el, ctx) {
    if (action === 'tab') {
      this.state.tab = el.dataset.tab;
      ctx.rerender();
      return true;
    }
    return false;
  },
};

// ---------------------------------------------------------------- Preparación de partida (mazo)
export const setup = {
  state: { deck: null },
  enter() {
    const own = ownedCards();
    this.state.deck = savedDeckOrExample().filter((n) => !CARD_BY_NUM[n]?.retired && own.includes(n));
  },
  errors() {
    return validateDeck(this.state.deck);
  },
  render() {
    const deck = this.state.deck;
    const errs = this.errors();
    const valid = errs.length === 0;
    const own = ownedCards();
    const sorted = CARDS.filter((d) => !d.retired && own.includes(d.num)).sort((a, b) => a.num - b.num);
    const cards = sorted
      .map((d) => {
        const on = deck.includes(d.num);
        return `<button class="pick ${on ? 'on' : ''}" data-action="toggle" data-num="${d.num}" aria-pressed="${on}">
          <span class="tick">✓</span>${cardHTML(d, { variant: 'hand', cls: on ? '' : 'off' })}</button>`;
      })
      .join('');
    return `<div class="screen">${topbar('Tu mazo')}
      <div class="counter"><span>${t(`Personajes`)}</span><span class="n ${valid ? '' : 'bad'}">${deck.length} / ${RULES.deckSize}</span></div>
      ${errs.length ? `<ul class="errors">${errs.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` : ''}
      <div class="scroll"><div class="grid">${cards}</div></div>
      <div class="bar">
        <button class="btn small cream" data-action="example"><span>${t(`Mazo de ejemplo`)}</span></button>
        <button class="btn small cream" data-action="random"><span>${t(`Al azar`)}</span></button>
        <button class="btn red big" data-action="play" ${valid ? '' : 'disabled'}><span>${t(`¡Jugar!`)}</span></button>
      </div></div>`;
  },
  onAction(action, el, ctx) {
    const s = this.state;
    if (action === 'toggle') {
      if (this.suppressToggle) return true;
      const n = Number(el.dataset.num);
      if (!ownedCards().includes(n)) return true;
      s.deck = s.deck.includes(n) ? s.deck.filter((x) => x !== n) : s.deck.concat([n]);
      setPrefs({ deck: s.deck });
      ctx.rerender(true);
      return true;
    }
    if (action === 'example') {
      s.deck = EXAMPLE_DECK.slice();
      setPrefs({ deck: s.deck });
      ctx.rerender(true);
      return true;
    }
    if (action === 'random') {
      s.deck = randomValidDeck({ rngState: newSeed() }, ownedCards());
      setPrefs({ deck: s.deck });
      ctx.rerender(true);
      return true;
    }
    if (action === 'play') {
      if (this.errors().length) {
        ctx.toast(this.errors()[0]);
        return true;
      }
      arrange.begin(s.deck);
      ctx.go('arrange');
      return true;
    }
    return false;
  },
};

// ---------------------------------------------------------------- Configuración
export const settings = {
  render() {
    const p = getPrefs();
    const snd = Sound.prefs();
    const yn = (on, act) => `<span class="seg"><button class="${on ? 'on' : ''}" data-action="${act}" data-v="1">${t('Sí')}</button><button class="${on ? '' : 'on'}" data-action="${act}" data-v="0">${t('No')}</button></span>`;
    return `<div class="screen">${topbar('Configuración')}
      <div class="scroll"><div class="panel"><h3>${t('Idioma')}</h3>
        <div class="settings-row"><span>${t('Idioma del juego')}</span>
          <span class="seg">${LANGS.map((l) => `<button class="${getLang() === l.id ? 'on' : ''}" data-action="lang" data-lang="${l.id}">${esc(l.label)}</button>`).join('')}</span></div></div>
        <div class="panel"><h3>${t('Dificultad')}</h3>
        <div class="settings-row"><span>${t('Rival')}</span>
          <span class="seg">${Object.values(AI_LEVELS).map((l) => `<button class="${p.aiLevel === l.id ? 'on' : ''}" data-action="level" data-level="${l.id}">${esc(t(l.label))}</button>`).join('')}</span></div></div>
        <div class="panel"><h3>${t('Sonido')}</h3>
          <div class="settings-row"><span>${t('Música')}</span>${yn(snd.musicOn, 'smusic')}</div>
          <input class="rng" type="range" min="0" max="100" value="${Math.round(snd.musicVol * 100)}" data-range="musicVol" aria-label="${t('Volumen de la música')}">
          <div class="settings-row"><span>${t('Efectos')}</span>${yn(snd.sfxOn, 'ssfx')}</div>
          <input class="rng" type="range" min="0" max="100" value="${Math.round(snd.sfxVol * 100)}" data-range="sfxVol" aria-label="${t('Volumen de los efectos')}"></div>
        <p class="note" style="opacity:.6;text-align:center">Capitán Barato v${VERSION}</p></div></div>`;
  },
  onAction(action, el, ctx) {
    if (action === 'lang') { setLang(el.dataset.lang); setPrefs({ lang: el.dataset.lang }); ctx.rerender(); return true; }
    if (action === 'smusic') { Sound.set({ musicOn: el.dataset.v === '1' }); ctx.rerender(); return true; }
    if (action === 'ssfx') { Sound.set({ sfxOn: el.dataset.v === '1' }); ctx.rerender(); if (el.dataset.v === '1') Sound.fx('select'); return true; }
    if (action === 'level') {
      setPrefs({ aiLevel: el.dataset.level });
      ctx.rerender();
      return true;
    }
    return false;
  },
};
