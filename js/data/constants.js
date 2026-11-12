// Constantes compartidas del juego. Fuente: PDF "Juego de Superheroes Arg." (Sistema de Juego, punto 4).

import { t } from '../i18n.js';

export const ATTRS = ['fue', 'int', 'vel', 'res', 'agi', 'car'];

// Los nombres se traducen al leerlos (getters), así cambian con el idioma elegido.
const named = (map) => Object.defineProperties({}, Object.fromEntries(Object.entries(map).map(([k, v]) => [k, { get: () => t(v), enumerable: true }])));
export const ATTR_NAMES = named({ fue: 'Fuerza', int: 'Inteligencia', vel: 'Velocidad', res: 'Resistencia', agi: 'Agilidad', car: 'Carisma' });
export const ATTR_SHORT = named({ fue: 'Fuer', int: 'Int', vel: 'Vel', res: 'Res', agi: 'Agi', car: 'Car' });

// Resultado del dado de 6 caras -> atributo (PDF: "Selección de Atributo").
export const DICE_TO_ATTR = { 1: 'fue', 2: 'int', 3: 'vel', 4: 'res', 5: 'agi', 6: 'car' };

export const PLAYERS = ['p1', 'p2'];

// Tiempo (ms) que se ven las dos cartas reveladas antes de que aparezca el cartel de ganaste/perdiste. Sólo interfaz y sonido.
export const RESULT_DELAY_MS = 1400;

export const RULES = {
  deckSize: 18,
  reserveSize: 9,
  roundsToWin: 2,
  totalRounds: 3,
  duelsPerRound: 3,
  handSize: 3,
  // El PDF dice "Cada Round consiste en 3 duelos" y a la vez que las cartas que sobran en la mano
  // vuelven a la Reserva. Decisión: el Round termina apenas alguien gana 2 duelos (`earlyRoundEnd: true`);
  // con `false` se juegan siempre los 3. Ver docs/PENDIENTES.md (R-02).
  earlyRoundEnd: true,
  // Empate absoluto (PDF, Resolución): "ganará el Round quien tenga el mayor valor". Por defecto se
  // sigue el texto literal: el ganador del desempate gana el Round. Ver docs/PENDIENTES.md (R-03).
  absoluteTieWinsRound: true,
  // Piso de los atributos modificados (el PDF habla de valores 0-100 y no define el piso). Ver R-05.
  attrFloor: 0,
};

export function normalizeClass(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}
