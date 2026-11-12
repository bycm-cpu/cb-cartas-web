// Personajes implementados en esta versión.
// FUENTE DE VERDAD: PDF "Juego de Superheroes Arg." (números, clases, atributos y textos).
// Los efectos se describen con datos estructurados (ver js/engine/effects.js para el catálogo de
// tipos y condiciones). No hay lógica especial de personajes en la interfaz.
//
// Campos:
//  num        número de carta del PDF
//  name       nombre
//  classes    clases (varias posibles)
//  obra       obra de origen
//  stats      fue/int/vel/res/agi/car
//  ability    { name, text, effects: [...], flags?: [...] }  habilidad de Duelo
//  active     { name, text, stack?: 'teamUp', effects: [...], flags?: [...], onDemand?: ... }  Efecto Activo
//  deckRules  { requires?: [num], legadoHeroico?: true }
//  art        ruta de la ilustración (reemplazable sin tocar el juego)
//
// Condiciones (when): ver CONDITIONS en effects.js.

const art = (n) => `assets/art/cards/${String(n).padStart(2, '0')}.jpg`;

const TEAM_UP = {
  name: 'Team Up',
  text: 'Otorga +5 a los atributos de toda Carta con este Efecto Activo (Acumulable)',
  stack: 'teamUp',
  // Cada carta Team Up en tu zona de Efecto Activo aporta +5 a las cartas que llevan Team Up (Acumulable).
  effects: [{ type: 'mod', target: 'self', amount: 5, when: { if: 'selfHasActiveStack', stack: 'teamUp' }, label: 'Efecto Activo Team Up' }],
};

const U = (def) => ({ implemented: true, ...def });

export const CARDS = [
  U({
    num: 1, name: 'Hombre Primordial', classes: ['Legado'], obra: 'El Hombre Primordial',
    stats: { fue: 89, int: 81, vel: 84, res: 88, agi: 86, car: 82 },
    ability: { name: 'Vínculo', text: 'Para añadir esta carta a tu mazo debes incluir la carta “Max” (N°02).', effects: [] },
    deckRules: { requires: [2] },
    art: art(1),
  }),
  U({
    num: 2, name: 'Max', classes: ['Humano'], obra: 'El Hombre Primordial',
    stats: { fue: 12, int: 31, vel: 9, res: 12, agi: 7, car: 13 },
    ability: { name: 'Vínculo', text: 'Para añadir esta carta a tu mazo debes incluir la carta “Hombre Primordial” (N°01).', effects: [] },
    deckRules: { requires: [1] },
    art: art(2),
  }),
  U({
    num: 5, name: 'Capitán Barato', classes: ['Urbano'], obra: 'Capitán Barato',
    stats: { fue: 25, int: 45, vel: 33, res: 42, agi: 33, car: 85 },
    ability: {
      name: 'Carismático',
      text: 'Si pierdes el duelo por 40 o + de diferencia se rehace el duelo pero ahora el atributo asignado es “Carisma”.',
      effects: [{ type: 'redoOnBigLoss', margin: 40, attr: 'car' }],
    },
    art: art(5),
  }),
  U({
    num: 6, name: 'Miss Capi', classes: ['Urbano'], obra: 'Capitán Barato',
    stats: { fue: 48, int: 50, vel: 39, res: 57, agi: 55, car: 51 },
    ability: {
      name: 'Formación',
      text: 'Puedes traer de la Reserva una carta con el Efecto Activo de “Team Up” para que reemplace una carta de tus Mazos Activos.',
      effects: [{ type: 'choice', kind: 'swapReserveActive', reserveFilter: { activeStack: 'teamUp' }, bonus: 0 }],
    },
    active: TEAM_UP,
    art: art(6),
  }),
  U({
    num: 7, name: 'Alto Voltaje', classes: ['Tecnológico'], obra: 'Capitán Barato',
    stats: { fue: 41, int: 76, vel: 35, res: 56, agi: 49, car: 33 },
    ability: { name: 'Heroísmo', text: 'Todos los Empates los gana este Jugador.', effects: [], flags: ['tiesWin'] },
    active: { ...TEAM_UP, text: 'Otorga +5 a los atributos de toda Carta con este Efecto Activo (Acumulable). Todos los Empates los gana este Jugador.', flags: ['tiesWin'] },
    art: art(7),
  }),
  U({
    num: 8, name: 'Guaraní', classes: ['Guerrero'], obra: 'Capitán Barato',
    stats: { fue: 45, int: 23, vel: 34, res: 44, agi: 41, car: 34 },
    ability: {
      name: 'Preparación',
      text: 'Obtiene +10 en sus Atributos por cada Round Jugado en la Partida.',
      effects: [{ type: 'mod', target: 'self', amount: 10, per: 'roundsPlayed', label: 'Preparación' }],
    },
    active: TEAM_UP,
    art: art(8),
  }),
  U({
    num: 9, name: 'Nomade', classes: ['Urbano'], obra: 'Capitán Barato',
    stats: { fue: 44, int: 41, vel: 52, res: 39, agi: 48, car: 33 },
    ability: {
      name: 'Ataque Calculado',
      text: 'Obtiene +10 en sus Atributos si tienes 2 cartas con “Team Up” en el Efecto Activo.',
      effects: [{ type: 'mod', target: 'self', amount: 10, when: { if: 'teamUpInActiveAtLeast', n: 2 }, label: 'Ataque Calculado' }],
    },
    active: TEAM_UP,
    art: art(9),
  }),
  U({
    num: 12, name: 'Machine Asimov', classes: ['Tecnológico', 'Espacial'], obra: 'Machine Asimov',
    stats: { fue: 77, int: 79, vel: 75, res: 79, agi: 76, car: 78 },
    ability: {
      name: 'Desgaste Espacial',
      text: 'Reduce -5 a sus atributos por cada Duelo ya Finalizado a lo largo de la partida.',
      effects: [{ type: 'mod', target: 'self', amount: -5, per: 'duelsFinished', label: 'Desgaste Espacial' }],
    },
    art: art(12),
  }),
  U({
    num: 18, name: 'Black Kraken', classes: ['Urbano'], obra: 'Puerto Kraken',
    stats: { fue: 49, int: 36, vel: 42, res: 43, agi: 40, car: 55 },
    ability: {
      name: 'Mentor Nato',
      text: 'Otorga un +10 en atributos a la siguiente carta que juegues. Si ganas el Duelo, otorga un +10 Adicional.',
      effects: [{ type: 'nextCardBonus', amount: 10, winExtra: 10 }],
    },
    art: art(18),
  }),
  U({
    num: 19, name: 'New Kraken', classes: ['Urbano'], obra: 'Puerto Kraken',
    stats: { fue: 56, int: 33, vel: 60, res: 43, agi: 57, car: 30 },
    ability: {
      name: 'Aprendiz Novato',
      text: 'Si Ganaste el Duelo anterior obtiene un +10 a sus atributos; si lo perdiste, recibe un -10.',
      effects: [
        { type: 'mod', target: 'self', amount: 10, when: { if: 'prevDuelWon' }, label: 'Aprendiz Novato (ganaste el duelo anterior)' },
        { type: 'mod', target: 'self', amount: -10, when: { if: 'prevDuelLost' }, label: 'Aprendiz Novato (perdiste el duelo anterior)' },
      ],
    },
    art: art(19),
  }),
  U({
    num: 22, name: 'Rancat', classes: ['Urbano'], obra: 'Rancat',
    stats: { fue: 47, int: 35, vel: 57, res: 43, agi: 56, car: 54 },
    ability: {
      name: 'Oportunista',
      text: 'Se apropia de las ventajas positivas de atributos que tenga el rival por este Duelo. Es inmune a la reducción de atributos.',
      effects: [{ type: 'stealPositive' }],
      flags: ['immuneToPenalty'],
    },
    art: art(22),
  }),
  U({
    num: 23, name: 'Caballero Rojo (34°)', classes: ['Urbano'], obra: 'Caballero Rojo',
    stats: { fue: 48, int: 37, vel: 64, res: 48, agi: 68, car: 29 },
    ability: {
      name: 'Legado Heroico',
      text: 'Solo puedes tener 1 carta en tu mazo con esta habilidad (Legado Heroico). Convierte las modificaciones Positivas del enemigo en Negativas para este Duelo.',
      effects: [{ type: 'convertFoePositive' }],
    },
    deckRules: { legadoHeroico: true },
    art: art(23),
  }),
  U({
    num: 24, name: 'Caballero Rojo (33°)', classes: ['Urbano'], obra: 'Caballero Rojo',
    stats: { fue: 68, int: 18, vel: 50, res: 63, agi: 34, car: 15 },
    ability: {
      name: 'Legado Heroico',
      text: 'Solo puedes tener 1 carta en tu mazo con esta habilidad (Legado Heroico). Si el oponente tiene menor Fuerza que Caballero Rojo, recibe un -20 a sus atributos.',
      effects: [{ type: 'mod', target: 'foe', amount: -20, when: { if: 'foeStatLowerThanSelf', attr: 'fue' }, label: 'Legado Heroico (menor Fuerza)' }],
    },
    deckRules: { legadoHeroico: true },
    art: art(24),
  }),
  U({
    num: 27, name: 'Caballero Rojo (1°)', classes: ['Legado', 'Guerrero'], obra: 'Caballero Rojo',
    stats: { fue: 58, int: 32, vel: 46, res: 58, agi: 50, car: 25 },
    ability: {
      name: 'Legado Heroico',
      text: 'Solo puedes tener 1 carta en tu mazo con esta habilidad (Legado Heroico). Si es el Primer Duelo de la Partida otorga +30 a sus atributos.',
      effects: [{ type: 'mod', target: 'self', amount: 30, when: { if: 'firstDuelOfGame' }, label: 'Legado Heroico (primer duelo de la partida)' }],
    },
    active: {
      name: 'Primera carta',
      text: 'La primera carta que jugas cada Round recibe un +10 a sus atributos.',
      effects: [{ type: 'mod', target: 'self', amount: 10, when: { if: 'firstCardOfRound' }, label: 'Efecto Activo: primera carta del Round' }],
    },
    deckRules: { legadoHeroico: true },
    art: art(27),
  }),
  U({
    num: 28, name: '“El Caballero Rojo”', classes: ['Titan'], obra: 'Caballero Rojo',
    stats: { fue: 16, int: 17, vel: 10, res: 52, agi: 13, car: 45 },
    ability: {
      name: 'Exiliado',
      text: 'Si no tienes ninguna carta con la habilidad “Legado Heroico” en tu Baraja obtiene un +35 a sus atributos.',
      effects: [{ type: 'mod', target: 'self', amount: 35, when: { if: 'noLegadoHeroicoInDeck' }, label: 'Exiliado' }],
    },
    art: art(28),
  }),
  U({
    num: 31, name: 'Parka', classes: ['Urbano'], obra: 'Parka',
    stats: { fue: 55, int: 51, vel: 30, res: 58, agi: 42, car: 23 },
    ability: {
      name: 'Venganza Ciega',
      text: 'Obtiene en sus estadísticas un +5 por cada Duelo que perdiste en la partida.',
      effects: [{ type: 'mod', target: 'self', amount: 5, per: 'duelsLost', label: 'Venganza Ciega' }],
    },
    art: art(31),
  }),
  U({
    num: 33, name: 'Connor', classes: ['Legado'], obra: 'Connor',
    stats: { fue: 39, int: 40, vel: 45, res: 50, agi: 48, car: 33 },
    ability: {
      name: 'Liderazgo Inspirador',
      text: 'Si es tu primera carta en este Round obtiene un +25 a sus atributos.',
      effects: [{ type: 'mod', target: 'self', amount: 25, when: { if: 'firstCardOfRound' }, label: 'Liderazgo Inspirador' }],
    },
    active: {
      name: 'Liderazgo Inspirador',
      text: 'Otorga un +2 a los atributos de tus cartas.',
      effects: [{ type: 'mod', target: 'self', amount: 2, label: 'Efecto Activo: Connor' }],
    },
    art: art(33),
  }),
  U({
    num: 34, name: 'Nica', classes: ['Urbano'], obra: 'Nica',
    stats: { fue: 34, int: 35, vel: 46, res: 52, agi: 47, car: 30 },
    ability: {
      name: 'Penalización',
      text: 'Otorga un -10 a los atributos del rival en Duelo. Si tiene alguna bonificación positiva, otorga un -20 extra a la carta del rival.',
      effects: [
        { type: 'mod', target: 'foe', amount: -10, label: 'Penalización' },
        { type: 'mod', target: 'foe', amount: -20, layer: 2, when: { if: 'foeHasPositive' }, label: 'Penalización (el rival tenía bonificación)' },
      ],
    },
    art: art(34),
  }),
  U({
    num: 36, name: 'Medium', classes: ['Místico', 'Mágico'], obra: 'Medium',
    stats: { fue: 28, int: 32, vel: 38, res: 52, agi: 38, car: 53 },
    ability: {
      name: 'Manipulación',
      text: 'Intercambia una carta de tu reserva con una de un Mazo Activo, si lo haces obtienes +10 a tus Atributos.',
      effects: [{ type: 'choice', kind: 'swapReserveActive', bonus: 10 }],
    },
    art: art(36),
  }),
  U({
    num: 38, name: 'Santa Sombra', classes: ['Místico'], obra: 'Santa Sombra',
    stats: { fue: 62, int: 45, vel: 62, res: 40, agi: 66, car: 33 },
    ability: {
      name: 'Sed de Sangre',
      text: 'Obtiene un +5 en sus atributos por cada Duelo ya terminado de jugar. Solo si es el Segundo Round en juego.',
      effects: [{ type: 'mod', target: 'self', amount: 5, per: 'duelsFinished', when: { if: 'roundIs', n: 2 }, label: 'Sed de Sangre' }],
    },
    art: art(38),
  }),
  U({
    num: 46, name: 'Súper... Cómicos?', classes: ['¡Paf!'], obra: 'Capitán Barato por Gustavo Sala',
    stats: { fue: 78, int: 57, vel: 60, res: 73, agi: 68, car: 89 },
    ability: {
      name: 'Cómico dependientes',
      text: 'Si en el duelo anterior el Atributo jugado no fue “Carisma” o no hubo duelo previo a este, la carta obtiene un -50 a sus atributos.',
      effects: [{ type: 'mod', target: 'self', amount: -50, when: { if: 'prevAttrNot', attr: 'car' }, label: 'Cómico dependientes' }],
    },
    art: art(46),
  }),
  U({
    num: 49, retired: true, name: 'Monarch', classes: ['Legado'], obra: 'Monarch',
    stats: { fue: 80, int: 30, vel: 72, res: 75, agi: 71, car: 30 },
    ability: {
      name: 'Lavado de Cerebro',
      text: 'Si esta Habilidad aun esta en juego siempre se activa: Pierdes este duelo.',
      effects: [{ type: 'autoLose' }],
    },
    art: art(49),
  }),
  U({
    num: 59, name: 'Caballero Rojo (13°)', classes: ['Legado'], obra: 'Caballero Rojo',
    stats: { fue: 46, int: 25, vel: 52, res: 51, agi: 47, car: 32 },
    ability: {
      name: 'Legado Heroico',
      text: 'Solo puedes tener 1 carta en tu mazo con esta habilidad (Legado Heroico). Obtiene +30 a sus Atributos enfrentandose a la Clase “Mistico” o “Naturaleza” en Duelo.',
      effects: [{ type: 'mod', target: 'self', amount: 30, when: { if: 'foeClassIn', classes: ['Místico', 'Naturaleza'] }, label: 'Legado Heroico (contra Místico/Naturaleza)' }],
    },
    active: {
      name: 'Anti-Místicos',
      text: 'Otorga -20 en Atributos a las Cartas del tipo “Místico” y “Naturaleza”.',
      effects: [{ type: 'mod', target: 'foe', amount: -20, when: { if: 'foeClassIn', classes: ['Místico', 'Naturaleza'] }, label: 'Efecto Activo: Caballero Rojo (13°)' }],
    },
    deckRules: { legadoHeroico: true },
    art: art(59),
  }),
  U({
    num: 60, name: 'Caballero Rojo (32°)', classes: ['Legado'], obra: 'Caballero Rojo',
    stats: { fue: 48, int: 53, vel: 28, res: 30, agi: 54, car: 40 },
    ability: {
      name: 'Legado Heroico',
      text: 'Solo puedes tener 1 carta en tu mazo con esta habilidad (Legado Heroico). Obtiene +30 a sus Atributos enfrentandose a la Clase “Urbano” o “Alterado” en Duelo.',
      effects: [{ type: 'mod', target: 'self', amount: 30, when: { if: 'foeClassIn', classes: ['Urbano', 'Alterado'] }, label: 'Legado Heroico (contra Urbano/Alterado)' }],
    },
    active: {
      name: 'Anti-Urbanos',
      text: 'Otorga un -15 en atributos a las Cartas de la Clase “Urbano” o “Alterado”.',
      effects: [{ type: 'mod', target: 'foe', amount: -15, when: { if: 'foeClassIn', classes: ['Urbano', 'Alterado'] }, label: 'Efecto Activo: Caballero Rojo (32°)' }],
    },
    deckRules: { legadoHeroico: true },
    art: art(60),
  }),
  U({
    num: 61, name: 'Caballero Rojo (35°)', classes: ['Urbano'], obra: 'Caballero Rojo',
    stats: { fue: 57, int: 35, vel: 57, res: 33, agi: 56, car: 27 },
    ability: {
      name: 'Legado Heroico',
      text: 'Solo puedes tener 1 carta en tu mazo con esta habilidad (Legado Heroico). Obtiene +30 a sus Atributos enfrentandose a la Clase “Guerrero” o “Legado” en Duelo.',
      effects: [{ type: 'mod', target: 'self', amount: 30, when: { if: 'foeClassIn', classes: ['Guerrero', 'Legado'] }, label: 'Legado Heroico (contra Guerrero/Legado)' }],
    },
    active: {
      name: 'Desarme',
      text: 'Puedes Descartar esta Carta para Descartar el Efecto Activo del Rival.',
      effects: [],
      onDemand: { kind: 'discardFoeActive' },
    },
    deckRules: { legadoHeroico: true },
    art: art(61),
  }),
  U({
    num: 64, name: 'Capitán Barato', classes: ['Guerrero'], obra: 'Capitán Barato',
    stats: { fue: 54, int: 45, vel: 38, res: 50, agi: 30, car: 79 },
    ability: {
      name: 'Asechador',
      text: 'Obtiene +20 a sus Atributos enfrentandose a las Clases “Mistico”, “Magico” o “Naturaleza”.',
      effects: [{ type: 'mod', target: 'self', amount: 20, when: { if: 'foeClassIn', classes: ['Místico', 'Mágico', 'Naturaleza'] }, label: 'Asechador' }],
    },
    active: {
      name: 'Asechador',
      text: 'Clase Guerrero +2 a los atributos; contra clases “Mistico”, “Magico” o “Naturaleza” otorga +10 en su lugar.',
      effects: [
        { type: 'mod', target: 'self', amount: 2, when: { all: [{ if: 'selfClassIn', classes: ['Guerrero'] }, { not: { if: 'foeClassIn', classes: ['Místico', 'Mágico', 'Naturaleza'] } }] }, label: 'Efecto Activo: Guerreros +2' },
        { type: 'mod', target: 'self', amount: 10, when: { all: [{ if: 'selfClassIn', classes: ['Guerrero'] }, { if: 'foeClassIn', classes: ['Místico', 'Mágico', 'Naturaleza'] }] }, label: 'Efecto Activo: Guerreros +10 contra Místico/Mágico/Naturaleza' },
      ],
    },
    art: art(64),
  }),
  U({
    num: 65, name: 'El Verdugo', classes: ['Guerrero'], obra: 'Annita',
    stats: { fue: 45, int: 25, vel: 50, res: 40, agi: 55, car: 30 },
    ability: {
      name: 'Sanguinario',
      text: 'Obtiene +5 a sus Atributos por cada carta en el descarte de tu oponente.',
      effects: [{ type: 'mod', target: 'self', amount: 5, per: 'foeDiscard', label: 'Sanguinario' }],
    },
    art: art(65),
  }),
  U({
    num: 66, name: 'Guaraní Doblegado', classes: ['Guerrero', 'Naturaleza'], obra: 'Tifon',
    stats: { fue: 55, int: 20, vel: 35, res: 50, agi: 45, car: 35 },
    ability: {
      name: 'Furia Imparable',
      text: 'Obtiene +5 en sus Atributos por cada Duelo ya jugado si tienes a “Guaraní” (N°08) en el Descarte.',
      effects: [{ type: 'mod', target: 'self', amount: 5, per: 'duelsFinished', when: { if: 'inOwnDiscard', num: 8 }, label: 'Furia Imparable' }],
    },
    art: art(66),
  }),
  U({
    num: 80, name: 'Asesino 55', classes: ['Urbano', 'Alterado'], obra: 'Asesino 55',
    stats: { fue: 52, int: 50, vel: 55, res: 29, agi: 56, car: 11 },
    ability: {
      name: 'Oportunista',
      text: 'Si tiene mas Velocidad que el Rival obtiene un +15 en todos sus atributos.',
      effects: [{ type: 'mod', target: 'self', amount: 15, when: { if: 'selfStatHigherThanFoe', attr: 'vel' }, label: 'Oportunista (más Velocidad)' }],
    },
    art: art(80),
  }),
];

export const CARD_BY_NUM = Object.fromEntries(CARDS.map((c) => [c.num, c]));

// Carta "fantasma" neutra, sólo para que la IA estime valores contra un rival cuya carta no conoce.
// No es un personaje del juego y nunca aparece en un mazo ni en la colección.
export const GHOST_NUM = 0;
export const GHOST_DEF = {
  num: GHOST_NUM, name: 'Rival desconocido', classes: [], obra: '', implemented: false,
  stats: { fue: 45, int: 45, vel: 45, res: 45, agi: 45, car: 45 },
};

// Cartas del PDF que todavía no están implementadas (se listan en la Colección como "en preparación").
// Solo se registran número y nombre, tal como figuran en el PDF.
export const PENDING_CARDS = [
  [3, 'Eva'], [4, 'Stan'], [10, 'Heka'], [11, 'Chica Alien'], [13, 'Connor del Espacio'], [14, 'Thrillher'],
  [15, 'Medusa on Faia'], [16, 'Cinabrio'], [17, 'Ciclope'], [20, 'Melopeia'], [21, 'Nanok Dah'],
  [25, 'Caballero Rojo (16°)'], [26, 'Caballero Rojo (17°)'], [29, 'Mikilo'], [30, 'Anita la Hija del Verdugo'],
  [32, 'Tesla'], [35, 'Ave Diurna'], [37, 'Sol de Plata'], [39, 'Mega'], [40, 'Crono'], [41, 'Salamandra'],
  [42, 'Mantis'], [43, 'Cisne Negro'], [44, 'Fenix'], [45, 'Jelly Kid'], [47, 'Sereno'], [48, 'Rufián'],
  [50, 'Blue Bird'], [51, 'Beta-K'], [52, 'Oveja Negra'], [53, 'Gallo de San Telmo'], [54, 'Lunaria'],
  [55, 'Caudillo'], [56, 'Lapidaria'], [57, 'Pelagia'], [58, 'Instinto'], [62, 'Zareck'], [63, 'Cazador'],
  [67, 'Manta'], [68, 'Ucumar'], [69, 'Dr. Paradox'], [70, 'DarkCat'], [71, 'Kronemberg'], [72, 'Ich'],
  [73, 'Cibersix'], [74, 'Angela Della Morte'], [75, 'Nekrodamus'], [76, 'Hark'], [77, 'Alvar Mayor'],
  [78, 'Aurea'], [79, 'Fantasma Nocturno'], [81, 'Animal Urbano'], [82, 'Agente Prisca'], [83, 'Hombre Vomito'],
  [84, 'Lars'], [85, 'Las Gemelas'], [86, 'Xero'], [87, 'Arkabot'],
].map(([num, name]) => ({ num, name, implemented: false }));

// Clases -> color de acento para la carta (variantes visuales). Ver css/cards.css.
export const CLASS_THEME = {
  urbano: 'urbano',
  guerrero: 'guerrero',
  tecnologico: 'tecnologico',
  legado: 'legado',
  mistico: 'mistico',
  magico: 'mistico',
  espacial: 'espacial',
  alterado: 'alterado',
  naturaleza: 'naturaleza',
  humano: 'humano',
  titan: 'legado',
};
