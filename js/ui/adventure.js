// Pantallas del modo Aventura: panel de la carrera, tienda (estilo vitrina de cómics), reemplazo de carta, mazo y fin.
import { CARD_BY_NUM } from '../data/cards.js';
import { ATTRS, ATTR_NAMES } from '../data/constants.js';
import { getPrefs, setPrefs, savedDeckOrExample } from '../settings.js';
import { validateDeck } from '../engine/deck.js';
import { newSeed } from '../engine/rng.js';
import { newRun, ensureOffer, buyCard, buyItem, ITEM_PRICE, FIGHTS, FLOORS, MAX_LIVES, fightLevel, cardPrice, startFight, chooseBonus, leaveNode, eventFor, applyEvent, NODE_LABEL } from '../adventure.js';
import { carouselHTML, initCarousel } from './carousel.js';
import { cardHTML } from './card.js';
import { attrIcon } from './icons.js';
import { header, coinChip, gemChip, ribbon, priceTag } from './chrome.js';
import { takeExtraLives, GEMS_ADVENTURE_WIN } from '../profile.js';
import { esc } from './util.js';
import { arrange } from './arrange.js';
import { t, td } from '../i18n.js';

export const getRun = () => { const r = getPrefs().run || null; return r && r.map && r.map[0] && r.map[0].type ? r : null; }; // una aventura guardada con un formato viejo (sin mapa o con el mapa anterior) se descarta
export const saveRun = (run) => setPrefs({ run });

const hearts = (n, max) => Array.from({ length: Math.max(max, n) }, (_, i) => `<span class="hrt ${i < n ? 'on' : ''}">♥</span>`).join('');
const heartBig = (n) => `<svg class="heart-art" viewBox="0 0 64 58" aria-hidden="true"><path d="M32 55C6 36 2 22 2 14 2 7 8 2 15 2c7 0 13 4 17 10C36 6 42 2 49 2c7 0 13 5 13 12 0 8-4 22-30 41z" fill="#d62f23" stroke="#16120d" stroke-width="4" stroke-linejoin="round"/><path d="M13 11c-4 1-6 5-5 9" stroke="#ff9a8a" stroke-width="4" stroke-linecap="round" fill="none"/></svg>${n ? `<b class="heart-n">×${n}</b>` : ''}`;
const dieArt = (glyph) => `<span class="die-art"><i class="burst"></i><span class="face"><b>${glyph}</b></span></span>`;
// Foto de cabecera: si existe assets/brand/shop-header.png se usa; si no, un collage de escenarios.
const shopArt = () => `url(/assets/brand/shop-header.jpg)`;

const power = (n) => Object.values(CARD_BY_NUM[n].stats).reduce((a, b) => a + b, 0);
const sortOffer = (st, offer) => offer.slice().sort((a, b) => (st.sort === 'power' ? power(b.num) - power(a.num) : a.price - b.price));

// Barra de compra de la carta seleccionada (precio + botón). Sin partida (run === null) la tienda es sólo de exploración:
// se ve el precio, pero no se puede comprar. La carta grande se abre en un overlay (ver openCardOverlay).
function detailHTML(run, o) {
  const act = o.sold ? `<span class="muted">${run ? t('Vendida') : t('Tuya')}</span>`
    : `<button class="btn red" data-action="${run ? 'advbuy' : 'shopbuy'}" data-num="${o.num}"><span>${t('Comprar')}</span></button>`;
  return `<div class="buy-row">${act}</div>`;
}

// Carta grande en un overlay (misma carta, más grande). El botón Comprar usa el de la barra de compra: no compra por sí solo.
function openCardOverlay(app, o, run) {
  const layer = document.querySelector('.top-layer');
  if (!layer) return;
  const ov = document.createElement('div');
  ov.className = 'overlay card-ov';
  ov.innerHTML = `<div class="detail-wrap">${cardHTML(CARD_BY_NUM[o.num], { variant: 'full' })}
    <div class="ov-buy">${o.sold ? `<span class="muted">${run ? t('Vendida') : t('Tuya')}</span>` : `${o.gems ? priceTag(o.gems, 'big gem') : priceTag(o.price, run && run.coins < o.price ? 'big no' : 'big')}<button class="btn red" data-ovbuy="1"><span>${t('Comprar')}</span></button>`}
    <button class="btn" data-close="1"><span>${t('Cerrar')}</span></button></div></div>`;
  const t0 = performance.now();
  ov.addEventListener('click', (e) => {
    if (performance.now() - t0 < 450) return; // al soltar el dedo después de mantener apretada no debe cerrarse
    if (e.target.closest('[data-tip]')) return;
    const buy = e.target.closest('[data-ovbuy]');
    ov.remove();
    if (buy) { const b = app.querySelector(`.buy-slot [data-num="${o.num}"]`); if (b) b.click(); }
  });
  layer.appendChild(ov);
}

// Tienda completa. `st` guarda el estado de la vista (sel, sort, tab, msg); `run` es la Aventura en curso o null.
export function shopHTML(st, run, offer, { back = 'hub', backAction = 'advview', deckCount = 18, wallet = null } = {}) {
  const browse = !run;
  const sorted = sortOffer(st, offer);
  if (!offer.some((o) => o.num === st.sel)) st.sel = (sorted.find((o) => !o.sold) || sorted[0]).num;
  const tab = (id, label, ico) => `<button class="${st.tab === id ? 'on' : ''}" data-action="advtab" data-tab="${id}"><span>${ico}${label}</span></button>`;
  const tabs = `<div class="tabs shop-tabs">${tab('cards', t('Cartas'), '<i class="ti t-card"></i>')}${tab('dice', t('Dados'), '<i class="ti t-die"></i>')}${tab('lives', t('Vidas'), '<i class="ti t-heart">♥</i>')}${tab('deck', t('Mazo'), '<i class="ti t-star">★</i>')}</div>`;
  const items = sorted.map((o) => ({ num: o.num, sold: o.sold, html: `<div class="pick">${cardHTML(CARD_BY_NUM[o.num], { variant: 'hand' })}${o.sold ? `<span class="sold-stamp">${browse ? t('Tuya') : t('Vendida')}</span>` : ''}</div>${o.sold ? '' : (o.gems ? priceTag(o.gems, wallet.gems < o.gems ? 'gem no' : 'gem') : priceTag(o.price, (browse ? wallet.coins < o.price : run.coins < o.price) ? 'no' : ''))}` }));
  const cur = offer.find((x) => x.num === st.sel);
  const cards = `<section id="sec-cards">${ribbon(t('Cartas'))}
    <div class="sort-row"><span>${t('Ordenar')}</span><button class="sortbtn" data-action="advsort"><span>${st.sort === 'power' ? t('Por poder') : t('Por costo')}</span> ⌄</button></div>
    <div class="cs">${carouselHTML(items, st.sel, { leftLabel: t('Anterior'), rightLabel: t('Siguiente') })}<div class="buy-slot">${detailHTML(run, cur)}</div></div></section>`;
  const funds = browse ? wallet.coins : run.coins;
  const price = (kind) => priceTag(ITEM_PRICE[kind], funds < ITEM_PRICE[kind] ? 'no' : '');
  const buy = (kind) => `<button class="btn red small" data-action="${browse ? 'shopitem' : 'advitem'}" data-kind="${kind}"><span>${t('Comprar')}</span></button>`;
  const have = (kind) => `<span class="have">${t('Tenés {n}', { n: (browse ? wallet.inv[kind] : run.mods[kind]) || 0 })}</span>`;
  const sku = (kind, glyph, name) => `<div class="tile">${dieArt(glyph)}<h5>${name}</h5>${have(kind)}${price(kind)}${buy(kind)}</div>`;
  const dice = `<section id="sec-dice" class="box wide">${ribbon(t('Dados especiales'))}
    <div class="tiles t3">${sku('reroll', '↻', t('Repetir dado'))}${sku('nudge', '±1', t('Mover dado ±1'))}${sku('loaded', '🎯', t('Dado cargado'))}</div>
    <p class="tip">${t('Repetir: volvés a tirar. Mover: cambiás la cara en uno. Cargado: elegís el atributo antes de tirar. Una mejora por duelo.')}</p></section>`;
  const mods = `<section id="sec-mods" class="box">${ribbon(t('Modificadores'), t('Ventaja temporal. Uso limitado.'))}
    <div class="tile">${dieArt('+10')}<h5>${t('Refuerzo')}</h5>${have('boost')}${price('boost')}${buy('boost')}</div>
    <p class="tip">${t('+10 a todos los atributos de tu carta en un duelo.')}</p></section>`;
  const lives = `<section id="sec-lives" class="box">${ribbon(t('Vidas'), t('Una oportunidad más.'))}
    <div class="tile lives">${heartBig(browse ? wallet.lives : run.lives)}<h5>${t('Una vida')}</h5>${browse ? `<span class="have">${t('Para tu próxima Aventura: {n}', { n: wallet.lives })}</span>` : ''}${price('life')}${buy('life')}</div></section>`;
  const gemsBox = `<section id="sec-gems" class="box wide">${ribbon(t('Diamantes'))}<div class="tile"><span class="gem-art"></span><h5>${t('Cartas premium: sólo con diamantes')}</h5><button class="btn red small" disabled><span>${t('Packs: próximamente')}</span></button></div></section>`;
  const note = browse ? '' : t('Comprar una carta reemplaza a otra de tu mazo.');
  const right = browse ? coinChip(wallet.coins) + gemChip(wallet.gems) : coinChip(run.coins);
  return `<div class="screen shop">${header({ title: t('Tienda'), back, backAction, right, art: shopArt() })}
    ${tabs}<div class="scroll shop-scroll">${st.msg ? `<p class="note flash">${esc(st.msg)}</p>` : ''}${cards}${dice}<div class="row2 even">${mods}${lives}</div>${browse ? gemsBox : ''}</div>
    <div class="shop-foot"><button class="deck-btn" data-action="advview" data-v="deck"><span class="mini-back"></span><b>${t('Tus cartas')}</b><em>${browse ? deckCount : `${deckCount}/18`}</em><span class="plus">+</span></button><span class="foot-note">${note}</span></div></div>`;
}

// Después de dibujar la tienda: arma el carrusel (sin re-dibujar la pantalla al deslizar) y salta a la sección pedida.
export function shopAfterRender(app, st, run, offer) {
  const sc = app.querySelector('.shop-scroll');
  initCarousel(app, (num) => {
    st.sel = num;
    const o = offer.find((x) => x.num === num) || shopCatalogItem(num);
    const slot = app.querySelector('.buy-slot');
    if (slot && o) slot.innerHTML = detailHTML(run, o);
  }, (num) => openCardOverlay(app, offer.find((x) => x.num === num) || shopCatalogItem(num), run));
  if (st.jump && sc) {
    const target = app.querySelector({ cards: '#sec-cards', dice: '#sec-dice', lives: '#sec-mods' }[st.jump]);
    if (target) sc.scrollTop = target.offsetTop - 26;
    st.jump = null;
  }
}
const shopCatalogItem = (num) => ({ num, price: cardPrice(num), gems: 0, sold: false });

export const adventure = {
  view: 'hub', // hub | shop | replace | deck
  tab: 'cards', // cards | dice | lives
  sel: null, // carta de la vitrina seleccionada
  pending: null, // carta comprada a la espera de elegir a cuál reemplaza
  target: null, // carta del mazo elegida para reemplazar
  sort: 'cost',
  msg: '',
  nextMsg: '',

  enter() { this.view = 'hub'; this.pending = null; this.target = null; this.msg = this.nextMsg; this.nextMsg = ''; },

  render(ctx) {
    const run = getRun();
    if (!run) return this.intro();
    if (run.over) return this.over(run);
    if (this.view === 'shop') return this.shop(run);
    if (this.view === 'replace') return this.replace(run);
    if (this.view === 'deck') return this.deck(run);
    return this.hub(run);
  },

  top(title, back, sub = '', right = '') {
    return header({ title, sub, back: back || 'menu', backAction: back ? 'advview' : 'go', right });
  },

  intro() {
    return `<div class="screen">${this.top(t('Aventura'), null)}<div class="scroll">
      <div class="panel"><h3>${t('Cómo funciona')}</h3>
        <ul>
          <li>${t('Subís un mapa de {n} pisos con tu mazo de 18 personajes. En cada piso hay un combate; al ganarlo elegís un premio (tienda, descanso o evento). Al final te espera el jefe.', { n: FLOORS })}</li>
          <li>${t('Tenés 3 vidas: si perdés un combate, perdés una vida y lo repetís en el mismo piso.')}</li>
          <li>${t('Ganás monedas en cada combate. La tienda sólo aparece cuando la elegís como premio: ahí comprás personajes (reemplazan a uno de tu mazo), vidas y mejoras de dado de uso limitado.')}</li>
          <li>${t('Las reglas de cada combate son las normales. Los números (precios, monedas, dificultad) son provisorios.')}</li>
        </ul></div>
      <button class="btn red big wide" data-action="advnew"><span>${t('Empezar aventura')}</span></button></div></div>`;
  },

  // Mapa de pisos (abajo = piso 1, arriba = jefe). Cada piso: un combate obligatorio y, al ganarlo, un premio a elegir.
  mapHTML(run) {
    const glyph = { combat: 'VS', shop: '$', rest: '♥', event: '?', boss: '★' };
    const rows = run.map.map((fl, f) => {
      const state = f < run.floor ? 'done' : f === run.floor ? 'now' : 'next';
      const go = f === run.floor && !run.node && !run.bonus && !run.over;
      const fight = `<button class="mnode ${fl.type} ${f < run.floor ? 'chosen' : ''} ${f === run.floor && run.node ? 'cur' : ''} ${go ? 'go' : ''}" data-action="advnode" ${go ? '' : 'disabled'}><b>${glyph[fl.type]}</b><span>${t(NODE_LABEL[fl.type])}</span></button>`;
      const bonus = fl.bonus.map((ty) => `<span class="mnode mini ${ty}"><b>${glyph[ty]}</b></span>`).join('');
      return `<div class="mrow ${state}"><span class="mf">${f + 1}</span><div class="mn">${fight}${bonus ? `<span class="mprize">${t('Premio')}</span>${bonus}` : ''}</div></div>`;
    });
    return `<div class="map">${rows.reverse().join('')}</div>`;
  },

  nodePanel(run) {
    const n = run.node;
    if (!n && run.bonus) {
      return `<div class="panel node-panel"><h3>${t('Elegí tu premio')}</h3>
        ${run.bonus.map((ty, i) => `<button class="btn yellow wide" data-action="advbonus" data-i="${i}"><span>${t(NODE_LABEL[ty])}</span></button>`).join('')}</div>`;
    }
    if (!n) return '';
    if (n.type === 'shop') {
      return `<div class="panel node-panel"><h3>${t('Tienda')}</h3>
        <button class="btn yellow big wide" data-action="advview" data-v="shop"><span>${t('Entrar a la tienda')}</span></button>
        <button class="btn cream wide" data-action="advleave"><span>${t('Seguir camino')}</span></button></div>`;
    }
    if (n.type === 'event') {
      const ev = eventFor(run);
      return `<div class="panel node-panel"><h3>${t(ev.title)}</h3>
        ${ev.options.map((o, i) => `<button class="btn yellow wide" data-action="advevent" data-i="${i}"><span>${t(o.label)}</span></button>`).join('')}</div>`;
    }
    return `<div class="panel node-panel"><h3>${t(NODE_LABEL[n.type])}</h3>
      <button class="btn red big wide" data-action="advfight"><span>${t('¡A combatir!')}</span></button>
      <button class="btn cream wide" data-action="advback"><span>${t('Volver')}</span></button></div>`;
  },

  hub(run) {
    return `<div class="screen">${this.top(t('Aventura'), null, t('Piso {n} de {total}', { n: Math.min(run.floor + 1, FLOORS), total: FLOORS }), coinChip(run.coins))}<div class="scroll">
      <div class="panel adv-stats">
        <div class="adv-row"><span>${t('Vidas')} ${hearts(run.lives, 3)}</span></div>
        <ul class="adv-mods"><li>${t('Repetir dado')}: <b>${run.mods.reroll || 0}</b></li><li>${t('Mover dado ±1')}: <b>${run.mods.nudge || 0}</b></li><li>${t('Dado cargado')}: <b>${run.mods.loaded || 0}</b></li><li>${t('Refuerzo')}: <b>${run.mods.boost || 0}</b></li></ul></div>
      ${this.msg ? `<p class="note flash">${esc(this.msg)}</p>` : ''}
      ${this.nodePanel(run)}
      ${this.mapHTML(run)}
      <button class="btn ghost small" data-action="advview" data-v="deck"><span>${t('Ver mi mazo')}</span></button>
      <button class="btn ghost small" data-action="advquit"><span>${t('Abandonar aventura')}</span></button></div></div>`;
  },

  // ------------------------------------------------------------------ tienda
  // La tienda se dibuja con shopHTML (compartido con la tienda independiente del menú, ui/shop.js).
  shop(run) {
    const offer = ensureOffer(run);
    saveRun(run);
    return shopHTML(this, run, offer);
  },

  power,

  // Después de dibujar: centra la carta elegida del carrusel y salta a la sección pedida con las pestañas.
  afterRender(app) {
    if (this.view !== 'shop') return;
    const run = getRun();
    shopAfterRender(app, this, run, run ? ensureOffer(run) : []);
  },

  // ------------------------------------------------------------------ mazo y reemplazo
  cardGrid(run, { valid = () => true, selected = null, action = 'detail' } = {}) {
    return `<div class="grid big">${run.deck.map((n) => `<button class="pick ${valid(n) ? '' : 'dim'} ${selected === n ? 'on' : ''}" data-action="${action}" data-num="${n}"><span class="tick">✓</span>${cardHTML(CARD_BY_NUM[n], { variant: 'hand' })}</button>`).join('')}</div>`;
  },

  replace(run) {
    const p = CARD_BY_NUM[this.pending];
    const valid = (n) => validateDeck(run.deck.map((x) => (x === n ? this.pending : x))).length === 0;
    const ready = this.target && valid(this.target);
    return `<div class="screen">${header({ title: t('Reemplazar'), sub: t('Comprás a {name}. ¿A cuál de tu mazo reemplaza?', { name: p.name }), back: 'shop', backAction: 'advview' })}
      <div class="scroll">${this.msg ? `<p class="note flash bad">${esc(this.msg)}</p>` : ''}${this.cardGrid(run, { valid, selected: this.target, action: 'advtarget' })}</div>
      <div class="bar"><div class="incoming">${cardHTML(p, { variant: 'mini' })}</div><button class="btn red big" data-action="advreplace" ${ready ? '' : 'disabled'}><span>${t('Reemplazar')}</span></button></div></div>`;
  },

  deck(run) {
    return `<div class="screen">${header({ title: t('Tus cartas'), sub: `${run.deck.length}/18 · ${t('Tocá una carta para verla completa.')}`, back: 'hub', backAction: 'advview' })}
      <div class="scroll">${this.cardGrid(run)}</div></div>`;
  },

  over(run) {
    const win = run.over === 'victory';
    return `<div class="screen big-end"><div class="stamp ${win ? '' : 'lose'}">${win ? t('¡Aventura completa!') : t('Fin de la aventura')}</div>
      <p style="max-width:300px;opacity:.9">${win ? t('¡Venciste al jefe! Ganaste {n} combates. ¡Capitán Barato estaría orgulloso! +{g} diamantes.', { n: run.wins, g: GEMS_ADVENTURE_WIN }) : t('Te quedaste sin vidas. Ganaste {n} combates.', { n: run.wins })}</p>
      <div style="display:flex;flex-direction:column;gap:14px;width:100%;max-width:320px">
        <button class="btn red big" data-action="advnew"><span>${t('Nueva aventura')}</span></button>
        <button class="btn ghost small" data-action="go" data-to="menu"><span>${t('Menú principal')}</span></button></div></div>`;
  },

  onAction(action, el, ctx) {
    const run = getRun();
    const again = () => { ctx.rerender(true); return true; };
    switch (action) {
      case 'advnew': { const nr = newRun(savedDeckOrExample(), newSeed()); nr.lives += takeExtraLives(); saveRun(nr); } this.enter(); this.tab = 'cards'; this.sel = null; return again();
      case 'advview': this.view = el.dataset.v; this.msg = ''; return again();
      case 'advtab':
        if (el.dataset.tab === 'deck') { this.view = 'deck'; return again(); }
        this.tab = el.dataset.tab; this.jump = el.dataset.tab; this.msg = ''; return again();
      case 'advsort': this.sort = this.sort === 'power' ? 'cost' : 'power'; return again();
      case 'advquit': saveRun(null); ctx.go('menu'); return true;
      case 'advnode': {
        const r = startFight(run);
        if (!r.ok) { this.msg = r.error; return again(); }
        this.msg = ''; saveRun(run);
        arrange.begin(run.deck, 'adventure'); ctx.mode = 'adventure'; ctx.go('arrange');
        return true;
      }
      case 'advbonus': {
        const r = chooseBonus(run, Number(el.dataset.i));
        if (!r.ok) { this.msg = r.error; return again(); }
        saveRun(run);
        if (r.type === 'rest') this.msg = r.rest.life ? t('Descansaste: +1 vida.') : t('Descansaste: +{n} monedas (ya tenés el máximo de vidas).', { n: r.rest.coins });
        else this.msg = '';
        if (r.type === 'shop') { this.view = 'shop'; this.tab = 'cards'; this.sel = null; }
        return again();
      }
      case 'advleave': leaveNode(run); saveRun(run); this.view = 'hub'; this.msg = ''; return again();
      case 'advback': run.node = null; saveRun(run); return again();
      case 'advevent': applyEvent(run, Number(el.dataset.i)); saveRun(run); this.msg = t('¡Listo!'); return again();
      case 'advfight': arrange.begin(run.deck, 'adventure'); ctx.mode = 'adventure'; ctx.go('arrange'); return true;
      case 'advitem': {
        const r = buyItem(run, el.dataset.kind);
        this.msg = r.ok ? t('¡Comprado!') : r.error;
        if (r.ok) saveRun(run);
        return again();
      }
      case 'advbuy': {
        const o = ensureOffer(run).find((x) => x.num === Number(el.dataset.num));
        if (o && run.coins < o.price) { this.msg = t('No te alcanzan las monedas.'); return again(); }
        this.pending = Number(el.dataset.num); this.target = null; this.view = 'replace'; this.msg = '';
        return again();
      }
      case 'advtarget': this.target = Number(el.dataset.num); this.msg = ''; return again();
      case 'advreplace': {
        const r = buyCard(run, this.pending, this.target);
        if (!r.ok) { this.msg = r.error; return again(); }
        saveRun(run);
        this.view = 'shop'; this.pending = null; this.target = null; this.msg = t('¡Comprado!');
        return again();
      }
      default: return false;
    }
  },
};
void ATTR_NAMES;
