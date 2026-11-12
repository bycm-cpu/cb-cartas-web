// Escenarios implementados. FUENTE: PDF (páginas 13-17). El número `id` es el orden del PDF.
// Los escenarios que dependen de sistemas todavía no implementados (Aliados, Objetos, mover
// Mazos Activos) quedan en PENDING_SCENARIOS y no entran al mazo de escenarios.
//
// effect.kind -> ver SCENARIO_EFFECTS en js/engine/scenarioEffects.js

const art = (n) => `assets/art/scenarios/${String(n).padStart(2, '0')}.jpg`;

const bonus = (attr, value, label) => ({ kind: 'bonusIf', attr, value, amount: 10, label });
const penalty = (attr, value, label) => ({ kind: 'penaltyIf', attr, value, amount: -10, label });
const classMod = (classes, amount) => ({ kind: 'classMod', classes, amount });

const S = (id, name, province, type, text, effect) => ({ id, name, province, type, text, effect, art: art(id), implemented: true });

export const SCENARIOS = [
  S(1, 'Aconcagua', 'Mendoza', 'Bonificación', 'Si tu héroe tiene 68 o más de Resistencia, supera la dificultad y obtiene +10 a todos sus atributos.', bonus('res', 68)),
  S(2, 'Cataratas del Iguazú', 'Misiones', 'Bonificación', 'Si tu héroe tiene 61 o más de Velocidad, supera la dificultad y obtiene +10 a todos sus atributos.', bonus('vel', 61)),
  S(3, 'Manzana Jesuítica', 'Córdoba', 'Bonificación', 'Si tu héroe tiene 53 o más de Inteligencia, supera la dificultad y obtiene +10 a todos sus atributos.', bonus('int', 53)),
  S(4, 'Mar del Plata', 'Buenos Aires', 'Bonificación', 'Si tu héroe tiene 51 o más de Carisma, supera la dificultad y obtiene +10 a todos sus atributos.', bonus('car', 51)),
  S(5, 'Talampaya', 'La Rioja', 'Bonificación', 'Si tu héroe tiene 58 o más de Fuerza, supera la dificultad y obtiene +10 a todos sus atributos.', bonus('fue', 58)),
  S(6, 'Ruta de los Siete Lagos', 'Neuquén', 'Bonificación', 'Si tu héroe tiene 57 o más de Agilidad, supera la dificultad y obtiene +10 a todos sus atributos.', bonus('agi', 57)),
  S(7, 'Salinas Grandes', 'Jujuy', 'Penalización', 'Si tu héroe tiene menos de 55 de Fuerza, recibe -10 a todos sus atributos.', penalty('fue', 55)),
  S(8, 'Ruinas de Quilmes', 'Tucumán', 'Penalización', 'Si tu héroe tiene menos de 50 de Inteligencia, recibe -10 a todos sus atributos.', penalty('int', 50)),
  S(9, 'Canal Beagle', 'Tierra del Fuego', 'Penalización', 'Si tu héroe tiene menos de 60 de Velocidad, recibe -10 a todos sus atributos.', penalty('vel', 60)),
  S(10, 'Lihué Calel', 'La Pampa', 'Penalización', 'Si tu héroe tiene menos de 55 de Resistencia, recibe -10 a todos sus atributos.', penalty('res', 55)),
  S(11, 'Quebrada de Humahuaca', 'Jujuy', 'Penalización', 'Si tu héroe tiene menos de 55 de Agilidad, recibe -10 a todos sus atributos.', penalty('agi', 55)),
  S(12, 'Puerto Madryn', 'Chubut', 'Penalización', 'Si tu héroe tiene menos de 50 de Carisma, recibe -10 a todos sus atributos.', penalty('car', 50)),
  S(13, 'Cerro Uritorco', 'Córdoba', 'Anulación parcial', 'Durante el 1.er Duelo, se anulan todas las habilidades de las cartas en juego.', { kind: 'cancelAbilitiesInDuel', duel: 1 }),
  S(14, 'San Ignacio Miní', 'Misiones', 'Anulación parcial', 'Durante el 2.º Duelo, se anulan todas las Habilidades de las cartas en juego.', { kind: 'cancelAbilitiesInDuel', duel: 2 }),
  S(15, 'Glaciar Perito Moreno', 'Santa Cruz', 'Anulación parcial', 'Durante el 3.er Duelo, se anulan todas las Habilidades de las cartas en juego.', { kind: 'cancelAbilitiesInDuel', duel: 3 }),
  S(16, 'Valle de la Luna', 'San Juan', 'Anulación parcial', 'Al comenzar el escenario se anulan todos los Efectos Activos de las cartas en juego.', { kind: 'clearActiveOnStart' }),
  S(17, 'Parque Nacional Los Glaciares', 'Santa Cruz', 'Potenciador', 'Durante este escenario, las Habilidades de Bonificación tienen el doble de su valor.', { kind: 'doubleAbilityBonus' }),
  S(18, 'Puerto Madero', 'Ciudad Autónoma de Buenos Aires', 'Potenciador', 'Durante este escenario, las Habilidades de Penalización tienen el doble de su valor.', { kind: 'doubleAbilityPenalty' }),
  S(19, 'Obelisco', 'Ciudad Autónoma de Buenos Aires', 'Potenciador de clase — Urbano', 'Las cartas de clase Urbano obtienen +10 a todos sus atributos durante este escenario.', classMod(['Urbano'], 10)),
  S(20, 'Túnel Subfluvial', 'Entre Ríos', 'Potenciador de clase — Tecnológico', 'Las cartas de clase Tecnológico obtienen +10 a todos sus atributos durante este escenario.', classMod(['Tecnológico'], 10)),
  S(21, 'Palacio San José', 'Entre Ríos', 'Potenciador de clase — Legado', 'Las cartas de clase Legado obtienen +10 a todos sus atributos durante este escenario.', classMod(['Legado'], 10)),
  S(22, 'Fuerte de Cobos', 'Salta', 'Potenciador de clase — Guerrero', 'Las cartas de clase Guerrero obtienen +10 a todos sus atributos durante este escenario.', classMod(['Guerrero'], 10)),
  S(23, 'Quebrada del Toro', 'Salta', 'Potenciador de clase — Místico', 'Las cartas de clase Místico obtienen +10 a todos sus atributos durante este escenario.', classMod(['Místico'], 10)),
  S(24, 'Campo de Piedra Pómez', 'Catamarca', 'Potenciador de clase — Espacial', 'Las cartas de clase Espacial obtienen +10 a todos sus atributos durante este escenario.', classMod(['Espacial'], 10)),
  S(25, 'Parque Nacional Chaco', 'Chaco', 'Potenciador de clase — Chakal/Kaiju', 'Las cartas de clase Chakal o Kaiju obtienen +10 a todos sus atributos durante este escenario.', classMod(['Chakal', 'Kaiju'], 10)),
  S(26, 'Esteros del Iberá', 'Corrientes', 'Potenciador de clase — Naturaleza', 'Las cartas de clase Naturaleza obtienen +10 a todos sus atributos durante este escenario.', classMod(['Naturaleza'], 10)),
  S(27, 'Caminito', 'Ciudad Autónoma de Buenos Aires', 'Potenciador de clase — Humano', 'Toda clase que no sea “Urbano, Tecnológico, Místico, Legado, Espacial o Guerrero” obtiene un +30 en sus Atributos.', { kind: 'classModExcept', classes: ['Urbano', 'Tecnológico', 'Místico', 'Legado', 'Espacial', 'Guerrero'], amount: 30 }),
  S(28, 'Parque Nacional Lanín', 'Neuquén', 'Efecto especial', 'Este Round todas las cartas pierden sus Clases.', { kind: 'noClasses' }),
  S(29, 'Monumento a la Bandera', 'Santa Fe', 'Reductor de clase — Urbano', 'Las cartas de clase Urbano reciben -20 a todos sus atributos durante este escenario.', classMod(['Urbano'], -20)),
  S(30, 'Mina La Mexicana', 'La Rioja', 'Reductor de clase — Tecnológico', 'Las cartas de clase Tecnológico reciben -20 a todos sus atributos durante este escenario.', classMod(['Tecnológico'], -20)),
  S(31, 'Estancia Jesuítica de Alta Gracia', 'Córdoba', 'Reductor de clase — Legado', 'Las cartas de clase Legado reciben -30 a todos sus atributos durante este escenario.', classMod(['Legado'], -30)),
  S(32, 'Cafayate', 'Salta', 'Reductor de clase — Místico', 'Las cartas de clase Místico reciben -20 a todos sus atributos durante este escenario.', classMod(['Místico'], -20)),
  S(33, 'Sierra de la Ventana', 'Buenos Aires', 'Reductor de clase — Guerrero', 'Las cartas de clase Guerrero reciben -20 a todos sus atributos durante este escenario.', classMod(['Guerrero'], -20)),
  S(34, 'Lago Nahuel Huapi', 'Río Negro', 'Reductor de clase — Espacial', 'Las cartas de clase Espacial reciben -20 a todos sus atributos durante este escenario.', classMod(['Espacial'], -20)),
  S(37, 'Parque Nacional El Palmar', 'Entre Ríos', 'Efecto especial', 'Durante todo este Round, no pueden aplicarse Habilidades de Bonificación.', { kind: 'noBonusAbilities' }),
  S(40, 'Cerro Colorado', 'Córdoba', 'Sin efecto', 'Sin efecto.', { kind: 'none' }),
  S(42, 'Potrero de los Funes', 'San Luis', 'Cancelación de atributo', 'Al comenzar el escenario, se determina 2 atributo al azar. Ese atributo queda anulado durante todo el escenario y no puede utilizarse para resolver Duelos.', { kind: 'banAttrs', count: 2 }),
  S(43, 'Parque Nacional Tierra del Fuego', 'Tierra del Fuego', 'Modificador de atributo', 'Durante este escenario, el valor más bajo es el ganador del Duelo.', { kind: 'lowestWins' }),
  S(45, 'Puente General Belgrano', 'Chaco / Corrientes', 'Escenario de duelo', 'Duelo 1: Fuerza. Duelo 2: Carisma. Duelo 3: Velocidad. Las demás estadísticas no se tienen en cuenta para resolver ese Duelo.', { kind: 'fixedAttrs', attrs: ['fue', 'car', 'vel'] }),
];

// No implementados en esta versión (motivo en docs/PENDIENTES.md).
export const PENDING_SCENARIOS = [
  { id: 35, name: 'Bañado La Estrella', reason: 'Requiere Aliados.' },
  { id: 36, name: 'Dique de Termas', reason: 'Ambiguo: qué cartas de qué Mazos Activos se descartan y cómo se reponen.' },
  { id: 38, name: 'Ushuaia', reason: 'Requiere Objetos.' },
  { id: 39, name: 'Península Valdés', reason: 'Ambiguo: "solo 1 carta" en los 3 Duelos.' },
  { id: 41, name: 'Bariloche', reason: 'Requiere Objetos y Aliados.' },
  { id: 44, name: 'Puente Carretero', reason: 'Requiere elegir cartas del Descarte y Mazo Activo (pendiente de interfaz).' },
];

export const SCENARIO_BY_ID = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]));
