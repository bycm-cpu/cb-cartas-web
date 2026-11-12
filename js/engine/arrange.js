// Armado de la partida: cómo se reparten las 18 cartas en Reserva (9) y 3 Mazos Activos (uno por Round, 3 cartas c/u).
// El PDF no dice quién decide el reparto: por defecto se baraja al azar. Esta variante permite elegirlo y
// ofrece una SUGERENCIA calculada con las reglas de las cartas (ver docs/ANALISIS_SINERGIAS.md, propuesta 1).
import { RULES } from '../data/constants.js';
import { CARD_BY_NUM } from '../data/cards.js';

const total = (n) => Object.values(CARD_BY_NUM[n].stats).reduce((a, b) => a + b, 0);

// Valor aproximado de tener la carta jugándose (no es una estadística medida: es el criterio de la sugerencia).
const ADJUST = {
  49: -9999, // Monarch: siempre pierde el duelo.
  46: -140, // Súper... Cómicos?: −50 salvo que el duelo anterior fuera Carisma.
  28: 0, // El Caballero Rojo: +35 solo sin Legado Heroico (se ajusta abajo).
  12: -20, // Machine Asimov: se apaga con cada duelo.
  2: -200, // Max: sólo está por el Vínculo.
};
// Momento ideal (Round 1..3) de cartas cuyo efecto depende del tiempo.
const ROUND_HINT = { 27: 1, 33: 1, 12: 1, 38: 2, 8: 3, 31: 3, 66: 3, 65: 3, 9: 2 };

function valueOf(n, deck) {
  let v = total(n) + (ADJUST[n] || 0);
  if (n === 28 && !deck.some((x) => CARD_BY_NUM[x].deckRules && CARD_BY_NUM[x].deckRules.legadoHeroico)) v += 35 * 6;
  if (ROUND_HINT[n]) v += 20; // las cartas con momento ideal conviene jugarlas, no guardarlas
  return v;
}

export function validateArrangement(deckNums, arr) {
  if (!arr || !Array.isArray(arr.reserve) || !Array.isArray(arr.active) || arr.active.length !== 3) return ['Reparto inválido.'];
  const all = [...arr.reserve, ...arr.active.flat()];
  const errors = [];
  if (arr.reserve.length !== RULES.reserveSize) errors.push(`La Reserva debe tener ${RULES.reserveSize} cartas.`);
  if (arr.active.some((a) => a.length !== RULES.handSize)) errors.push(`Cada Mazo Activo debe tener ${RULES.handSize} cartas.`);
  if (all.length !== deckNums.length || [...all].sort((a, b) => a - b).join() !== [...deckNums].sort((a, b) => a - b).join()) errors.push('El reparto debe usar exactamente las cartas del mazo.');
  return errors;
}

// Sugerencia determinista. Criterio:
//  1) A los Mazos Activos van las 9 cartas de más valor; la Reserva queda con el resto.
//  2) Si hay Miss Capi guardamos en Reserva un Team Up para traer; si hay Medium, una carta fuerte para intercambiar.
//  3) Las cartas con momento ideal van a su Round; Black Kraken y New Kraken van en el mismo Mazo.
//  4) El resto se reparte para que los 3 Rounds queden parejos (cualquiera puede decidir la partida).
export function suggestArrangement(deckNums) {
  const deck = deckNums.slice();
  const val = (n) => valueOf(n, deck);
  const ranked = deck.slice().sort((a, b) => val(b) - val(a) || a - b);
  let active = ranked.slice(0, RULES.handSize * 3);
  const reserveWanted = [];
  if (deck.includes(6)) {
    const tu = [7, 8, 9].filter((n) => deck.includes(n)).sort((a, b) => val(b) - val(a))[0];
    if (tu) reserveWanted.push(tu);
  }
  if (deck.includes(36)) {
    const strong = ranked.find((n) => !reserveWanted.includes(n) && n !== 36 && n !== 1);
    if (strong) reserveWanted.push(strong);
  }
  for (const n of reserveWanted) {
    if (active.includes(n)) {
      const weakest = ranked.filter((x) => !active.includes(x))[0];
      if (weakest !== undefined) active = active.filter((x) => x !== n).concat([weakest]);
    }
  }
  const reserve = deck.filter((n) => !active.includes(n));
  const piles = [[], [], []];
  const sum = (p) => p.reduce((a, n) => a + val(n), 0);
  const place = (n, i) => { if (piles[i].length < 3 && !piles.some((p) => p.includes(n))) piles[i].push(n); };
  if (active.includes(18) && active.includes(19)) { place(18, 0); place(19, 0); }
  for (const n of active) if (ROUND_HINT[n]) { const i = ROUND_HINT[n] - 1; if (piles[i].length < 3 && !piles.some((p) => p.includes(n))) piles[i].push(n); }
  for (const n of active.slice().sort((a, b) => val(b) - val(a))) {
    if (piles.some((p) => p.includes(n))) continue;
    const open = piles.map((p, i) => i).filter((i) => piles[i].length < 3).sort((a, b) => sum(piles[a]) - sum(piles[b]));
    piles[open[0]].push(n);
  }
  return { reserve, active: piles };
}

export function randomArrangement(deckNums, rand) {
  const a = deckNums.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return { reserve: a.slice(0, 9), active: [a.slice(9, 12), a.slice(12, 15), a.slice(15, 18)] };
}
