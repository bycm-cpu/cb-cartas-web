// Catálogo de la tienda, separado del modo Aventura.
// Cada carta: { num, price, gems, sold }. `price` = monedas; las cartas premium cuestan sólo diamantes (`gems`).
// `sold` = ya es tuya. Las compras viven en profile.js.
// Pagos con dinero real (packs de diamantes): NO existen todavía (hace falta Google Play Billing).
import { CARD_BY_NUM } from './data/cards.js';
import { cardPrice } from './adventure.js';
import { PREMIUM } from './data/premium.js';

export const shopCatalog = (owned = []) => Object.values(CARD_BY_NUM)
  .filter((c) => !c.retired)
  .map((c) => (c.num in PREMIUM
    ? { num: c.num, price: 0, gems: PREMIUM[c.num], sold: owned.includes(c.num) }
    : { num: c.num, price: cardPrice(c.num), gems: 0, sold: owned.includes(c.num) }));
