// Perfil permanente del jugador (se guarda en el teléfono, junto a las preferencias): monedas, diamantes,
// cartas compradas, mejoras de dado sin gastar y vidas extra para la próxima Aventura.
// TODOS los números de acá son PROVISORIOS (no están medidos). No es estado de partida: la partida sigue sin guardarse.
import { getPrefs, setPrefs } from './settings.js';
import { EXAMPLE_DECK, validateDeck } from './engine/deck.js';
import { CARD_BY_NUM } from './data/cards.js';
import { ITEM_PRICE, cardPrice, LIVES, MAX_LIVES } from './adventure.js';
import { t } from './i18n.js';
import { PREMIUM } from './data/premium.js';
export { PREMIUM };

export const START_COINS_PROFILE = 10;
// Cartas "premium": no se compran con monedas, sólo con diamantes (más difíciles de conseguir). Número = precio en diamantes.
export const GEMS_ADVENTURE_WIN = 2; // diamantes por completar una Aventura
export const MAX_EXTRA_LIVES = MAX_LIVES - LIVES;

const clean = (n) => Math.max(0, Math.floor(Number(n) || 0));
const MODS = ['reroll', 'nudge', 'loaded', 'boost'];

function fresh() {
  const p = getPrefs();
  const saved = Array.isArray(p.deck) && validateDeck(p.deck).length === 0 ? p.deck : [];
  const owned = [...new Set([...EXAMPLE_DECK, ...saved])].filter((n) => CARD_BY_NUM[n] && !CARD_BY_NUM[n].retired);
  return { coins: START_COINS_PROFILE, gems: 0, owned, inv: { reroll: 1, nudge: 1, loaded: 0, boost: 0 }, lives: 0 };
}

export function getProfile() {
  let pr = getPrefs().profile;
  if (!pr || !Array.isArray(pr.owned)) { pr = fresh(); setPrefs({ profile: pr }); }
  return pr;
}
const save = (pr) => { setPrefs({ profile: pr }); return pr; };

export const isOwned = (n) => getProfile().owned.includes(n);
export const ownedCards = () => getProfile().owned.slice();
export const isPremium = (n) => Object.prototype.hasOwnProperty.call(PREMIUM, n);
// Precio de una carta: { gems } si es premium, { coins } si no.
export const priceOf = (n) => (isPremium(n) ? { gems: PREMIUM[n] } : { coins: cardPrice(n) });

export function addCoins(n) { const pr = getProfile(); pr.coins += clean(n); return save(pr); }
export function addGems(n) { const pr = getProfile(); pr.gems += clean(n); return save(pr); }

export function buyCard(num) {
  const pr = getProfile();
  if (!CARD_BY_NUM[num] || CARD_BY_NUM[num].retired) return { ok: false, error: t('No está disponible.') };
  if (pr.owned.includes(num)) return { ok: false, error: t('Ya la tenés.') };
  const price = priceOf(num);
  if (price.gems) {
    if (pr.gems < price.gems) return { ok: false, error: t('No te alcanzan los diamantes.') };
    pr.gems -= price.gems;
  } else {
    if (pr.coins < price.coins) return { ok: false, error: t('No te alcanzan las monedas.') };
    pr.coins -= price.coins;
  }
  pr.owned = pr.owned.concat([num]);
  save(pr);
  return { ok: true };
}

export function buyItem(kind) {
  const pr = getProfile();
  const price = ITEM_PRICE[kind];
  if (!price) return { ok: false, error: t('Desconocido.') };
  if (kind === 'life' && pr.lives >= MAX_EXTRA_LIVES) return { ok: false, error: t('Ya tenés el máximo de vidas.') };
  if (pr.coins < price) return { ok: false, error: t('No te alcanzan las monedas.') };
  pr.coins -= price;
  if (kind === 'life') pr.lives += 1; else pr.inv[kind] = (pr.inv[kind] || 0) + 1;
  save(pr);
  return { ok: true };
}

// Mejoras de dado para llevar a una partida contra la IA.
export const inventory = () => ({ ...getProfile().inv });
// Después de una partida (o al salir) queda lo que no se gastó.
export function saveLeftovers(left) {
  if (!left) return;
  const pr = getProfile();
  for (const k of MODS) pr.inv[k] = clean(left[k]);
  save(pr);
}
// Vidas extra compradas: se suman al empezar una Aventura y se consumen.
export function takeExtraLives() { const pr = getProfile(); const n = pr.lives; if (n) { pr.lives = 0; save(pr); } return n; }
