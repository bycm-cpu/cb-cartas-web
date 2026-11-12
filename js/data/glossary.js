// Glosario de términos del juego: en las cartas se marcan y, al tocarlos, muestran una burbuja con su explicación.
import { t } from '../i18n.js';

// Se arma cada vez (los textos dependen del idioma). El orden importa: primero los términos largos.
export const glossary = () => [
  ['Efecto Activo', t('Al salir del duelo la carta va a la zona de Efectos Activos y su efecto vale para los duelos siguientes. Activar otro efecto descarta el anterior.')],
  ['Team Up', t('Efecto Activo que se acumula con otros Team Up en lugar de reemplazarlos.')],
  ['Legado Heroico', t('Solo podés tener 1 carta con esta habilidad en tu mazo.')],
  ['Mazo Activo', t('Las 3 cartas que llevás a tu mano en una Ronda.')],
  ['Reserva', t('Cartas de tu mazo que no se juegan, salvo que una habilidad las intercambie.')],
  ['Descarte', t('Cartas que ya se jugaron.')],
  ['Escenario', t('Cada Ronda tiene un Escenario con un efecto especial.')],
];
