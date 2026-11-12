// Pantalla "Armá tus Rounds": se reparten las 18 cartas del mazo en Reserva (9) y un Mazo Activo por Round (3 + 3 + 3).
// Tocá una carta y después otra para intercambiarlas. Mantené apretada una carta para leerla completa.
import { CARD_BY_NUM } from '../data/cards.js';
import { suggestArrangement, randomArrangement } from '../engine/arrange.js';
import { cardHTML } from './card.js';
import { esc } from './util.js';
import { t } from '../i18n.js';
import { ICON } from './icons.js';
import { header } from './chrome.js';

export const arrange = {
  state: { deck: null, arr: null, sel: null },

  begin(deck, back = 'setup') {
    this.state = { deck: deck.slice(), arr: suggestArrangement(deck), sel: null, suggested: true, back };
  },

  zones() {
    const a = this.state.arr;
    return [
      { id: 'a0', label: t('Ronda {n}', { n: 1 }), sub: t('Tu mano de la primera Ronda'), list: a.active[0] },
      { id: 'a1', label: t('Ronda {n}', { n: 2 }), sub: t('Tu mano de la segunda Ronda'), list: a.active[1] },
      { id: 'a2', label: t('Ronda {n}', { n: 3 }), sub: t('Tu mano de la tercera Ronda'), list: a.active[2] },
      { id: 'res', label: t('Reserva'), sub: t('No se juegan: sólo entran con cartas como Medium o Miss Capi'), list: a.reserve },
    ];
  },

  render() {
    const s = this.state;
    const zone = (z) => {
      const cards = z.list
        .map((n, i) => {
          const on = s.sel && s.sel.z === z.id && s.sel.i === i;
          return `<button class="pick ${on ? 'on' : ''}" data-action="aslot" data-z="${z.id}" data-i="${i}" data-num="${n}" aria-pressed="${on}">${cardHTML(CARD_BY_NUM[n], { variant: 'hand' })}</button>`;
        })
        .join('');
      return `<section class="az ${z.id === 'res' ? 'res' : ''}"><h3>${esc(z.label)} <small>${esc(z.sub)}</small></h3><div class="grid">${cards}</div></section>`;
    };
    return `<div class="screen">${header({ title: t('Armá tus Rondas'), back: s.back || 'setup' })}
      <div class="scroll">
        ${this.zones().map(zone).join('')}</div>
      <div class="bar">
        <button class="btn small cream" data-action="asuggest"><span>${t('Sugerencia')}</span></button>
        <button class="btn small cream" data-action="arandom"><span>${t('Al azar')}</span></button>
        <button class="btn red big" data-action="astart"><span>${t('¡Empezar!')}</span></button>
      </div></div>`;
  },

  onAction(action, el, ctx) {
    const s = this.state;
    const listOf = (z) => (z === 'res' ? s.arr.reserve : s.arr.active[Number(z[1])]);
    if (action === 'aslot') {
      const z = el.dataset.z, i = Number(el.dataset.i);
      if (!s.sel) s.sel = { z, i };
      else if (s.sel.z === z && s.sel.i === i) s.sel = null;
      else {
        const A = listOf(s.sel.z), B = listOf(z);
        [A[s.sel.i], B[i]] = [B[i], A[s.sel.i]];
        s.sel = null;
        s.suggested = false;
      }
      ctx.rerender(true);
      return true;
    }
    if (action === 'asuggest') { s.arr = suggestArrangement(s.deck); s.sel = null; s.suggested = true; ctx.rerender(true); return true; }
    if (action === 'arandom') { s.arr = randomArrangement(s.deck, Math.random); s.sel = null; s.suggested = false; ctx.rerender(true); return true; }
    if (action === 'astart') { ctx.startGame(s.deck.slice(), s.arr); return true; }
    return false;
  },
};
