// Efectos de escenario. Cada tipo declara de forma aislada qué hace; el motor sólo los consulta.
import { ATTRS } from '../data/constants.js';
import { t } from '../i18n.js';
import { hasAnyClass } from './catalog.js';
import { normalizeClass } from '../data/constants.js';

// Se ejecuta al comenzar el escenario (inicio del Round).
// Devuelve { flags, notes } que el motor guarda en state.scenarioFlags / log.
export function onScenarioStart(state, scenario, hooks) {
  const e = scenario.effect;
  const flags = {};
  const notes = [];
  switch (e.kind) {
    case 'clearActiveOnStart': {
      let n = 0;
      for (const side of ['p1', 'p2']) {
        const p = state.players[side];
        n += p.activeZone.length;
        while (p.activeZone.length) p.discard.push(p.activeZone.shift());
      }
      notes.push(n ? t('Se anularon {n} Efecto(s) Activo(s): las cartas van al descarte.', { n }) : t('No había Efectos Activos para anular.'));
      break;
    }
    case 'banAttrs': {
      const pool = ATTRS.slice();
      const banned = [];
      for (let i = 0; i < e.count; i++) {
        const idx = hooks.randInt(pool.length);
        banned.push(pool.splice(idx, 1)[0]);
      }
      flags.bannedAttrs = banned;
      notes.push(t('Atributos anulados durante el escenario: {list}.', { list: banned.map((a) => hooks.attrName(a)).join(t(' y ')) }));
      break;
    }
    case 'noClasses':
      flags.noClasses = true;
      break;
    case 'noBonusAbilities':
      flags.noBonusAbilities = true;
      break;
    case 'doubleAbilityBonus':
      flags.doubleAbilityBonus = true;
      break;
    case 'doubleAbilityPenalty':
      flags.doublePenalty = true;
      break;
    case 'lowestWins':
      flags.lowestWins = true;
      break;
    case 'fixedAttrs':
      flags.fixedAttrs = e.attrs.slice();
      break;
    default:
      break;
  }
  return { flags, notes };
}

// ¿Se anulan las habilidades de las cartas en este duelo (1..3)?
export function scenarioCancelsAbilities(scenario, duelNumber) {
  const e = scenario && scenario.effect;
  return !!(e && e.kind === 'cancelAbilitiesInDuel' && e.duel === duelNumber);
}

// Entradas de modificación del escenario para una carta jugada.
// `info` = { side, def (carta), classes (clases efectivas), baseStats }
export function scenarioEntries(scenario, info) {
  const e = scenario && scenario.effect;
  if (!e) return [];
  const src = scenario.name;
  const mk = (amount, label) => [{ side: info.side, attrs: 'all', amount, origin: 'scenario', source: src, label, detail: null }];
  switch (e.kind) {
    case 'bonusIf':
      // Se evalúa con el valor impreso de la carta (ver docs/PENDIENTES.md, R-07).
      return info.baseStats[e.attr] >= e.value ? mk(e.amount, t('{src}: tiene {value} o más', { src, value: e.value })) : [];
    case 'penaltyIf':
      return info.baseStats[e.attr] < e.value ? mk(e.amount, t('{src}: tiene menos de {value}', { src, value: e.value })) : [];
    case 'classMod':
      return hasAnyClass(info.classes, e.classes) ? mk(e.amount, t('{src}: clase afectada', { src })) : [];
    case 'classModExcept':
      return info.classes.length === 0 || !hasAnyClass(info.classes, e.classes) ? mk(e.amount, t('{src}: clase sin potenciador propio', { src })) : [];
    default:
      return [];
  }
}

export function scenarioLabelClasses(list) {
  return list.map(normalizeClass);
}
