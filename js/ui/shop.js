// Tienda independiente (se abre desde el menú, sin Aventura): se paga con las monedas y diamantes permanentes (profile.js).
// Comparte el dibujo con la tienda de la Aventura (shopHTML) pero NO lee ni escribe la partida de aventura (getRun/saveRun).
import { CARD_BY_NUM } from '../data/cards.js';
import { getProfile, buyCard, buyItem } from '../profile.js';
import { shopCatalog } from '../shop-catalog.js';
import { shopHTML, shopAfterRender } from './adventure.js';
import { cardHTML } from './card.js';
import { header } from './chrome.js';
import { t } from '../i18n.js';

export const shop = {
  view: 'shop', // shop | deck
  tab: 'cards',
  sel: null,
  sort: 'cost',
  msg: '',
  jump: null,

  enter() { this.view = 'shop'; this.msg = ''; },

  render() {
    const pr = getProfile();
    const deck = pr.owned.slice().sort((a, b) => a - b);
    if (this.view === 'deck') {
      return `<div class="screen">${header({ title: t('Tus cartas'), sub: `${deck.length}`, back: 'shop', backAction: 'advview' })}
        <div class="scroll"><div class="grid big">${deck.map((n) => `<button class="pick" data-action="detail" data-num="${n}">${cardHTML(CARD_BY_NUM[n], { variant: 'hand' })}</button>`).join('')}</div></div></div>`;
    }
    return shopHTML(this, null, shopCatalog(pr.owned), { back: 'menu', backAction: 'go', deckCount: deck.length, wallet: pr });
  },

  afterRender(app) {
    if (this.view === 'shop') shopAfterRender(app, this, null, shopCatalog(getProfile().owned));
  },

  onAction(action, el, ctx) {
    const again = () => { ctx.rerender(); return true; };
    switch (action) {
      case 'advview': this.view = el.dataset.v; this.msg = ''; return again();
      case 'advtab':
        if (el.dataset.tab === 'deck') { this.view = 'deck'; return again(); }
        this.tab = el.dataset.tab; this.jump = el.dataset.tab; this.msg = ''; return again();
      case 'advsort': this.sort = this.sort === 'power' ? 'cost' : 'power'; return again();
      case 'shopbuy': {
        const r = buyCard(Number(el.dataset.num));
        this.msg = r.ok ? t('¡Comprado!') : r.error;
        return again();
      }
      case 'shopitem': {
        const r = buyItem(el.dataset.kind);
        this.msg = r.ok ? t('¡Comprado!') : r.error;
        return again();
      }
      default: return false;
    }
  },
};
