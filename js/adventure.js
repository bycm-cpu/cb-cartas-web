// Modo Aventura: una carrera de combates seguidos con TU mazo de 18, vidas, monedas y tienda entre combates.
// No es parte del PDF: es un modo aparte. Las reglas de cada combate son las normales del juego; lo único
// que cambia son las mejoras de dado de uso limitado que se compran acá (ver USE_DIE_MOD en engine/game.js).
// Todos los números (precios, monedas, dificultad) son PROVISORIOS y no están medidos.
import { CARD_BY_NUM } from './data/cards.js';
import { validateDeck } from './engine/deck.js';
import { shuffle } from './engine/rng.js';
import { PREMIUM } from './data/premium.js';
import { t } from './i18n.js';

export const FIGHTS = 5; // (histórico) combates de la Aventura lineal; hoy la Aventura es un mapa de pisos
export const LIVES = 3;
export const START_COINS = 8;
export const OFFER_SIZE = 6;
// Precios según lo medido (scripts/medir_items.mjs): ~1,5 monedas por punto de victoria por uso.
export const ITEM_PRICE = { life: 14, reroll: 8, nudge: 12, loaded: 9, boost: 6 };
export const MAX_LIVES = 5;

const stat = (n) => Object.values(CARD_BY_NUM[n].stats).reduce((a, b) => a + b, 0);
// Precio según la suma de atributos (28..510): entre 3 y 17 monedas.
export const cardPrice = (n) => Math.max(3, Math.min(17, Math.round(stat(n) / 30)));

// ---- Mapa (estilo Slay the Spire). TODO PROVISORIO. Cada piso tiene un combate OBLIGATORIO (el último es el jefe). ----
// Al ganar un combate se elige UN premio entre 2 opciones: shop (tienda: sólo se compra acá), rest (descanso: +1 vida) o event (evento con 2 opciones).
// Medido: cuando los combates eran opcionales, evitarlos era la mejor estrategia (96% de aventuras completas contra 33% peleando todo).
export const FLOORS = 6;
export function genMap(seed) {
  const rng = { rngState: ((seed >>> 0) ^ 0x51ed270b) >>> 0 };
  const floors = [];
  for (let f = 0; f < FLOORS; f++) floors.push({ type: f === FLOORS - 1 ? 'boss' : 'combat', bonus: f === FLOORS - 1 ? [] : shuffle(rng, ['shop', 'rest', 'event']).slice(0, 2) });
  return floors;
}

export const NODE_LABEL = { combat: 'Combate', shop: 'Tienda', rest: 'Descanso', event: 'Evento', boss: 'Jefe' };

// Empieza el combate del piso actual (no se puede si hay un premio sin elegir).
export function startFight(run) {
  const fl = run.map && run.map[run.floor];
  if (!fl || run.over || run.node || run.bonus) return { ok: false, error: t('No disponible.') };
  run.node = { type: fl.type, i: 0 };
  return { ok: true, type: fl.type };
}

// Elige el premio de un combate ganado. Descanso: se aplica ya. Tienda/evento: quedan abiertos hasta cerrarlos.
export function chooseBonus(run, i) {
  const ty = run.bonus && run.bonus[i];
  if (!ty || run.node || run.over) return { ok: false, error: t('No disponible.') };
  run.bonus = null;
  if (ty === 'rest') return { ok: true, type: ty, rest: restNode(run) };
  run.node = { type: ty, i };
  return { ok: true, type: ty };
}

// Cierra la tienda o el evento abierto.
export function leaveNode(run) {
  run.node = null;
  run.offer = null;
}

// Descanso: +1 vida; si ya tenés el máximo, monedas.
export function restNode(run) {
  if (run.lives < MAX_LIVES) { run.lives += 1; return { life: 1 }; }
  run.coins += REST_COINS;
  return { coins: REST_COINS };
}
export const REST_COINS = 8;

// Eventos: dos opciones cada uno. Provisorios.
export const EVENTS = [
  { id: 'feria', title: 'Feria callejera', options: [{ label: '+7 monedas', coins: 7 }, { label: '+1 Repetir dado', mod: 'reroll' }] },
  { id: 'mate', title: 'Mate con un desconocido', options: [{ label: '+1 Mover dado ±1', mod: 'nudge' }, { label: '+1 Refuerzo', mod: 'boost' }] },
  { id: 'billete', title: 'Un billete en el suelo', options: [{ label: '+10 monedas', coins: 10 }, { label: '+1 Dado cargado', mod: 'loaded' }] },
];
export const eventFor = (run) => EVENTS[((run.seed >>> 0) + run.floor * 7) % EVENTS.length];
export function applyEvent(run, optIndex) {
  const o = eventFor(run).options[optIndex];
  if (!o) return { ok: false };
  if (o.coins) run.coins += o.coins;
  if (o.mod) run.mods[o.mod] = (run.mods[o.mod] || 0) + 1;
  leaveNode(run);
  return { ok: true };
}

export function newRun(deck, seed) {
  return { deck: deck.slice(), lives: LIVES, coins: START_COINS, fight: 0, mods: { reroll: 1, nudge: 1, loaded: 0, boost: 0 }, seed: seed >>> 0, shopSeq: 0, offer: null, over: null, wins: 0, map: genMap(seed), floor: 0, node: null, bonus: null, path: [] };
}

// Dificultad provisoria: los 2 primeros combates contra rival Fácil, el resto Normal.
export const fightLevel = (run) => ((run.floor ?? run.fight) < 2 ? 'easy' : 'normal');

export function ensureOffer(run) {
  if (run.offer) return run.offer;
  const rng = { rngState: (run.seed + run.shopSeq * 7919) >>> 0 };
  run.shopSeq += 1;
  // Sólo se ofrecen cartas que se pueden comprar de verdad: que exista algún reemplazo que deje el mazo válido.
  const fits = (n) => run.deck.some((d) => validateDeck(run.deck.map((x) => (x === d ? n : x))).length === 0);
  const pool = Object.keys(CARD_BY_NUM).map(Number).filter((n) => !CARD_BY_NUM[n].retired && !(n in PREMIUM) && !run.deck.includes(n) && fits(n));
  run.offer = shuffle(rng, pool).slice(0, OFFER_SIZE).map((num) => ({ num, price: cardPrice(num), sold: false }));
  return run.offer;
}

// Comprar una carta: reemplaza `replace` (de tu mazo). Devuelve { ok, error }.
export function buyCard(run, num, replace) {
  const slot = ensureOffer(run).find((o) => o.num === num && !o.sold);
  if (!slot) return { ok: false, error: t('No está disponible.') };
  if (run.coins < slot.price) return { ok: false, error: t('No te alcanzan las monedas.') };
  const idx = run.deck.indexOf(replace);
  if (idx < 0) return { ok: false, error: t('Elegí qué carta de tu mazo reemplazar.') };
  const next = run.deck.slice();
  next[idx] = num;
  const errors = validateDeck(next);
  if (errors.length) return { ok: false, error: errors.join(' ') };
  run.deck = next;
  run.coins -= slot.price;
  slot.sold = true;
  return { ok: true };
}

export function buyItem(run, kind) {
  const price = ITEM_PRICE[kind];
  if (!price) return { ok: false, error: t('Desconocido.') };
  if (run.coins < price) return { ok: false, error: t('No te alcanzan las monedas.') };
  if (kind === 'life') {
    if (run.lives >= MAX_LIVES) return { ok: false, error: t('Ya tenés el máximo de vidas.') };
    run.lives += 1;
  } else run.mods[kind] = (run.mods[kind] || 0) + 1;
  run.coins -= price;
  return { ok: true };
}

// Monedas por combate: ganar 8 + 2 por Ronda ganada; perder 3.
export const reward = (won, roundsWon) => (won ? 8 + 2 * roundsWon : 3);

// Aplica el resultado de un combate y devuelve un resumen. `usedMods` descuenta los usos gastados.
export function finishFight(run, { won, roundsWon, modsLeft }) {
  const boss = !!(run.node && run.node.type === 'boss');
  const coins = reward(won, roundsWon) * (boss ? 2 : 1);
  run.coins += coins;
  if (modsLeft) run.mods = { reroll: modsLeft.reroll || 0, nudge: modsLeft.nudge || 0, loaded: modsLeft.loaded || 0, boost: modsLeft.boost || 0 };
  run.offer = null;
  if (won) {
    run.wins += 1;
    run.fight += 1;
    run.path.push(0);
    run.node = null;
    if (boss || (!run.map && run.fight >= FIGHTS)) run.over = 'victory';
    else if (run.map) run.bonus = run.map[run.floor].bonus.slice(); // premio del piso que acabás de ganar
    if (run.map) run.floor += 1;
  } else {
    run.node = null; // vuelve a elegir camino en el mismo piso
    run.lives -= 1;
    if (run.lives <= 0) run.over = 'defeat';
  }
  return { coins, over: run.over };
}
