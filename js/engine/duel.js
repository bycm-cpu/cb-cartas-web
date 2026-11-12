// Cálculo de un duelo: reúne las modificaciones de escenario, habilidades, Efectos Activos y
// bonos arrastrados, aplica las capas de resolución y devuelve los valores finales.
//
// ORDEN DE RESOLUCIÓN (documentado en docs/PENDIENTES.md, R-04):
//   1. Anulaciones (escenario: habilidades del duelo / bonificaciones de habilidades).
//   2. Capa 1: modificaciones directas (escenario, habilidades, Efectos Activos, bonos arrastrados,
//      resultados de decisiones del jugador).
//   3. Capa 2a: transformaciones (robar positivas — Rancat; invertir positivas — Caballero Rojo 34°).
//   4. Capa 2b: modificaciones condicionadas por lo que ya recibió el rival (Nica).
//   5. Inmunidades a penalizaciones.
//   6. Duplicadores de escenario (Los Glaciares / Puerto Madero).
//   7. Suma sobre el valor impreso, con piso en RULES.attrFloor.
//   8. Comparación del atributo del duelo.
import { ATTRS, RULES } from '../data/constants.js';
import { t, td } from '../i18n.js';
import { cardDef, scenarioDef } from './catalog.js';
import {
  other,
  effectiveClasses,
  generateModEntries,
  generateLayer2ModEntries,
  entryAppliesTo,
} from './effects.js';
import { scenarioEntries, scenarioCancelsAbilities } from './scenarioEffects.js';

export function currentScenario(state) {
  return state.scenario ? scenarioDef(state.scenario.id) : null;
}

export function abilitiesEnabled(state) {
  return !scenarioCancelsAbilities(currentScenario(state), state.duelIndex + 1);
}

const ABILITY_ORIGINS = new Set(['ability', 'active', 'choice', 'carryover']);

export function computeDuel(state, ctx) {
  const defs = {
    p1: cardDef(state.cards[ctx.cards.p1].num),
    p2: cardDef(state.cards[ctx.cards.p2].num),
  };
  const scenario = currentScenario(state);
  const flags = state.scenarioFlags || {};
  const enabled = abilitiesEnabled(state);
  const entries = [];
  const notes = [];
  const sideFlags = { p1: {}, p2: {} };
  const cxFor = (side) => ({ state, side, foe: other(side), defs, entries });
  const sides = ['p1', 'p2'];

  if (!enabled) notes.push(t('{name}: se anulan las Habilidades de las cartas en este duelo.', { name: scenario.name }));

  // 2. Capa 1
  for (const side of sides) {
    const def = defs[side];
    const cx = cxFor(side);
    entries.push(
      ...scenarioEntries(scenario, { side, def, classes: effectiveClasses(cx, side), baseStats: def.stats }),
    );
  }
  for (const side of sides) {
    const def = defs[side];
    if (enabled && def.ability) {
      const label = `${def.name}: ${td(def.ability.name)}`;
      for (const eff of def.ability.effects) {
        entries.push(...generateModEntries(eff, cxFor(side), 'ability', label, ctx.cards[side]));
        if (eff.type === 'autoLose') sideFlags[side].autoLose = true;
        if (eff.type === 'redoOnBigLoss') sideFlags[side].redo = { margin: eff.margin, attr: eff.attr };
        if (eff.type === 'nextCardBonus') sideFlags[side].nextCardBonus = { amount: eff.amount, winExtra: eff.winExtra };
        if (eff.type === 'stealPositive') sideFlags[side].steal = true;
        if (eff.type === 'convertFoePositive') sideFlags[side].convert = true;
      }
      for (const f of def.ability.flags || []) sideFlags[side][f] = true;
    }
  }
  for (const side of sides) {
    for (const uid of state.players[side].activeZone) {
      const adef = cardDef(state.cards[uid].num);
      const a = adef.active;
      if (!a) continue;
      for (const eff of a.effects) {
        entries.push(...generateModEntries(eff, cxFor(side), 'active', `${adef.name}: ${td(a.name)}`, uid));
      }
      for (const f of a.flags || []) sideFlags[side][f] = true;
    }
  }
  for (const side of sides) {
    for (const c of state.players[side].carry) {
      entries.push({ side, attrs: 'all', amount: c.amount, origin: 'carryover', source: c.source, label: c.label, detail: null });
    }
  }
  for (const e of ctx.extraEntries || []) entries.push({ ...e });

  // 1 (parte 2). Escenario: sin bonificaciones de habilidades.
  if (flags.noBonusAbilities) {
    for (const e of entries) {
      if (ABILITY_ORIGINS.has(e.origin) && e.amount > 0) e.removed = t('{name}: no se aplican Habilidades de Bonificación', { name: scenario.name });
    }
  }

  const live = () => entries.filter((e) => !e.removed);

  // 3. Capa 2a
  for (const side of sides) {
    const foe = other(side);
    if (sideFlags[side].steal) {
      for (const e of live().filter((x) => x.side === foe && x.amount > 0)) {
        e.removed = t('Robada por {card}', { card: defs[side].name });
        entries.push({ ...e, removed: undefined, side, label: t('{label} (robada a {card})', { label: e.label, card: defs[foe].name }), stolen: true });
      }
    }
    if (sideFlags[side].convert) {
      for (const e of live().filter((x) => x.side === foe && x.amount > 0)) {
        e.amount = -e.amount;
        e.label = t('{label} (invertida por {card})', { label: e.label, card: defs[side].name });
        e.origin = 'ability';
        e.converted = true;
      }
    }
  }

  // 4. Capa 2b
  for (const side of sides) {
    const def = defs[side];
    if (!(enabled && def.ability)) continue;
    const label = `${def.name}: ${td(def.ability.name)}`;
    const cx = { ...cxFor(side), entries: live() };
    for (const eff of def.ability.effects) {
      entries.push(...generateLayer2ModEntries(eff, cx, 'ability', label, ctx.cards[side]));
    }
  }

  // 5. Inmunidades
  for (const side of sides) {
    if (!sideFlags[side].immuneToPenalty) continue;
    for (const e of live().filter((x) => x.side === side && x.amount < 0)) {
      e.removed = t('{card} es inmune a la reducción de atributos', { card: defs[side].name });
    }
  }

  // 6. Duplicadores de escenario
  for (const e of live()) {
    if (!ABILITY_ORIGINS.has(e.origin) || e.scaled) continue;
    if (flags.doubleAbilityBonus && e.amount > 0) {
      e.amount *= 2; e.scaled = true; e.detail = `${scenario.name}: x2`;
    } else if (flags.doublePenalty && e.amount < 0) {
      e.amount *= 2; e.scaled = true; e.detail = `${scenario.name}: x2`;
    }
  }

  // 7. Valores finales
  const final = { p1: {}, p2: {} };
  for (const side of sides) {
    for (const a of ATTRS) {
      const sum = live()
        .filter((e) => e.side === side && entryAppliesTo(e, a))
        .reduce((s, e) => s + e.amount, 0);
      final[side][a] = Math.max(RULES.attrFloor, defs[side].stats[a] + sum);
    }
  }

  return { defs, entries, notes, sideFlags, final, lowestWins: !!flags.lowestWins, scenario };
}

// 8. Comparación en un atributo. Devuelve { winner: 'p1'|'p2'|null, v1, v2, diff }.
export function compareAt(result, attr) {
  const v1 = result.final.p1[attr];
  const v2 = result.final.p2[attr];
  let winner = null;
  if (v1 !== v2) {
    const p1Higher = v1 > v2;
    winner = result.lowestWins ? (p1Higher ? 'p2' : 'p1') : p1Higher ? 'p1' : 'p2';
  }
  return { winner, v1, v2, diff: Math.abs(v1 - v2) };
}

export function summarizeEntries(result, side) {
  return result.entries
    .filter((e) => e.side === side)
    .map((e) => ({
      label: e.label,
      amount: e.amount,
      origin: e.origin,
      detail: e.detail || null,
      removed: e.removed || null,
    }));
}
