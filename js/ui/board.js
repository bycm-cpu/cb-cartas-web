// Pantalla de partida. Sólo lee la VISTA del jugador (nunca el estado completo) y envía acciones.
import { ATTR_NAMES, ATTRS, RULES, DICE_TO_ATTR, RESULT_DELAY_MS } from '../data/constants.js';
import { cardDef, scenarioDef } from '../engine/catalog.js';
import { legalActions, eligibleSwap, roundDuelWins } from '../engine/game.js';
import { cardHTML, modsHTML, backHTML, scenarioCardHTML } from './card.js';
import { attrIcon, ICON } from './icons.js';
import { esc, signed } from './util.js';
import { Sound } from '../audio.js';
import { t, td } from '../i18n.js';
import { coachHTML, coachAfterRender, tutorialAction } from './tutorial.js';

// El registro de la partida está apagado a pedido (no se ve); el código sigue. Poné true para volver a mostrar el botón.
const SHOW_LOG = false;

const defOf = (v, uid) => cardDef(v.cards[uid].num);
const me = 'p1';
const foeSide = 'p2';

export const game = {
  ui: { selected: null, overlay: null, draft: {}, hideResult: false, lastKey: '', throwOpen: false, throwAt: 0 },

  reset() {
    this.ui = { selected: null, overlay: null, draft: {}, hideResult: false, lastKey: '', throwOpen: false, throwAt: 0 };
  },

  // ------------------------------------------------------------------ render
  render(ctx, fx = []) {
    const c = ctx.controller;
    if (!c.state) return '';
    const v = c.view();
    const ui = this.ui;
    // Cambió el momento de la partida: se limpian selecciones y paneles locales.
    const key = `${v.round}-${v.duelIndex}-${v.phase}-${v.duel ? v.duel.locked.p1 : ''}`;
    if (key !== ui.lastKey) {
      const phaseChanged = !ui.lastKey || ui.lastKey.split('-').slice(0, 3).join('-') !== key.split('-').slice(0, 3).join('-');
      ui.lastKey = key;
      if (phaseChanged) { ui.hideResult = false; ui.resultDetail = false; ui.draft = {}; }
    }
    if (ui.selected && !v.players[me].hand.includes(ui.selected)) ui.selected = null;
    if (v.phase === 'game_over') return this.endScreen(v, ctx);
    // Se revelan las dos cartas y el cartel de ganaste/perdiste aparece un momento después, para ver contra qué carta se jugó.
    const dd = v.duel;
    const bothPlayed = !!(dd && dd.picks && dd.picks[me] && dd.picks[foeSide] && dd.picks[foeSide] !== 'hidden-pick');
    const holdKey = `${v.round}-${v.duelIndex}`;
    if (v.phase === 'duel_result' && bothPlayed && ui.heldKey !== holdKey) {
      ui.heldKey = holdKey; ui.holdUntil = Date.now() + RESULT_DELAY_MS;
      setTimeout(() => {
        ui.holdUntil = 0;
        if (ctx.controller.state && ctx.controller.view().phase === 'duel_result') ctx.rerender(true);
      }, RESULT_DELAY_MS);
    }
    ui.holding = v.phase === 'duel_result' && Date.now() < (ui.holdUntil || 0);
    const la = legalActions(v, me);
    return `<div class="screen board">
      ${this.top(v)}
      ${this.scenarioPill(v)}
      ${this.dieBand(v, fx)}
      ${this.duelRow(v, fx)}
      ${this.actionBar(v, la)}
      ${this.dock(v, la)}
      ${this.phaseOverlay(v, la)}
      ${this.throwOverlay(v, fx)}
      ${this.userOverlay(v)}
      ${coachHTML(v, ui)}
    </div>`;
  },

  pips(n, total, cls) {
    return `<span class="pips">${Array.from({ length: total }, (_, i) => `<span class="pip ${i < n ? cls : ''}"></span>`).join('')}</span>`;
  },

  top(v) {
    const w = v.roundWins;
    return `<div class="b-top">
      <button class="icon-btn" data-action="quit" aria-label="${t('Salir')}">${ICON.back}</button>
      <div class="mid"><div class="rnd">${t('Ronda {n} de {total}', { n: v.round, total: RULES.totalRounds })}</div>
        <div class="score">${t('Vos')} ${this.pips(w.p1, RULES.roundsToWin, 'won')} <span>—</span> ${this.pips(w.p2, RULES.roundsToWin, 'lost')} ${t('Rival')}</div></div>
      ${SHOW_LOG ? `<button class="icon-btn" data-action="overlay" data-type="log" aria-label="${t('Registro de la partida')}">${ICON.log}</button>` : '<span class="icon-btn" style="visibility:hidden" aria-hidden="true"></span>'}
    </div>`;
  },

  scenarioPill(v) {
    const sc = scenarioDef(v.scenario.id);
    return `<button class="scn-pill" data-action="overlay" data-type="scenario" aria-label="${t('Ver escenario')}">
      ${scenarioCardHTML(sc, { variant: 'tiny', width: '78px' })}
      <span class="tx"><span class="nm">${esc(sc.name)}<small>${esc(sc.province)}</small></span><span class="ef">${esc(td(sc.text))}</span></span>
      <span class="more">›</span></button>`;
  },

  zoneChip(zone, ico, label, n, fx) {
    return `<button class="zc ${fx ? 'fx' : ''}" data-action="zone" data-zone="${zone}" aria-label="${label}: ${n}">${ico}<span class="zl">${label}</span><b>${n}</b></button>`;
  },

  // Franja del dado: lo del rival a la izquierda, el dado al centro, el avance de los duelos a la derecha.
  dieBand(v, fx) {
    const d = v.duel;
    const phase = v.phase;
    const attr = d && d.attr;
    const f = v.players[foeSide];
    const rolled = d && d.rolls.length ? d.rolls[d.rolls.length - 1].die : null;
    const fixed = v.scenarioFlags && v.scenarioFlags.fixedAttrs;
    const dieHtml = '';
    const popCls = fx.includes('roll') ? 'pop' : '';
    const badge = attr
      ? `<div class="attr-badge ${popCls}" style="--sc:var(--a-${attr})"><span>${esc(ATTR_NAMES[attr])}</span>${fixed ? `<small>${t('Escenario')}</small>` : ''}</div>`
      : phase === 'duel_roll' ? `<div class="attr-badge idle"><span>${t('¿Qué atributo?')}</span></div>` : '';
    const left = `<div class="db-side">
      ${this.zoneChip('foeReserve', ICON.deck, t('Reserva'), f.counts.reserve)}
      ${this.zoneChip('foeDiscard', ICON.discard, t('Descarte'), f.discard.length)}
      ${this.zoneChip('foeActive', ICON.star, t('Efectos'), f.activeZone.length, f.activeZone.length)}</div>`;
    const rows = Array.from({ length: RULES.duelsPerRound }, (_, i) => {
      const r = v.roundDuels[i];
      let cls = '';
      if (r) cls = r.winner === me ? 'won' : 'lost';
      else if (i === v.duelIndex && phase !== 'round_intro' && phase !== 'round_result') cls = 'now';
      return `<div class="dp ${cls}"><i></i><span>${t('Duelo {n}', { n: i + 1 })}</span></div>`;
    }).join('');
    return `<div class="dieband">${left}<div class="db-mid">${dieHtml}${badge}</div><div class="db-side right">${rows}</div></div>`;
  },

  // Las dos cartas del duelo, grandes y enfrentadas.
  duelRow(v, fx) {
    const d = v.duel;
    const res = d && d.resolution;
    const phase = v.phase;
    const showFoe = (() => {
      if (!d || phase === 'round_intro') return `<div class="empty"></div>`;
      const pick = d.picks[foeSide];
      if (res && res.cards[foeSide]) return this.revealCard(v, res.cards[foeSide], foeSide, res, fx);
      if (d.revealed && pick && pick !== 'hidden-pick') return this.revealCard(v, pick, foeSide, null, fx);
      if (pick) {
        // La animación de entrada sólo se hace la primera vez en cada duelo (cada redibujado la repetiría).
        const key = `${v.round}-${v.duelIndex}`;
        const cls = this.ui.dropKey === key ? '' : 'drop';
        this.ui.dropKey = key;
        return backHTML({ cls, style: '--cw:var(--duel-w)' });
      }
      return `<div class="empty">${phase === 'duel_pick' ? t('Eligiendo…') : ''}</div>`;
    })();
    const showMe = (() => {
      if (!d || phase === 'round_intro') return `<div class="empty"></div>`;
      const pick = d.picks[me];
      if (res && res.cards[me]) return this.revealCard(v, res.cards[me], me, res, fx);
      if (pick) return this.revealCard(v, pick, me, null, fx);
      if (phase === 'duel_pick' && this.ui.selected && v.players[me].hand.includes(this.ui.selected)) {
        return `<div class="preview">${this.revealCard(v, this.ui.selected, me, null, fx)}</div>`;
      }
      return `<div class="empty">${phase === 'duel_pick' ? t('Tu carta') : ''}</div>`;
    })();
    const winCls = (side) => (res && res.winner && !this.ui.holding ? (res.winner === side ? 'win' : 'lose') : '');
    return `<div class="duel-row">
      <div class="slot foe ${winCls(foeSide)}">${showFoe}<span class="who">${t('Rival')}</span></div>
      <div class="slot me ${winCls(me)}">${showMe}<span class="who">${t('Vos')}</span></div>
    </div>`;
  },

  // Dado a pantalla completa: fondo desenfocado y el dado se tira con un deslizamiento del dedo.
  throwOverlay(v, fx) {
    if (!this.ui.throwOpen) return '';
    const d = v.duel;
    const rolled = d && d.rolls.length ? d.rolls[d.rolls.length - 1].die : null;
    const done = v.phase !== 'duel_roll' && rolled;
    const attr = d && d.attr;
    const die = this.dieCube(done ? rolled : null, done && Date.now() - this.ui.throwAt < 1200);
    const bottom = done && attr
      ? `<div class="attr-badge pop" style="--sc:var(--a-${attr})"><span>${esc(ATTR_NAMES[attr])}</span></div>`
      : `<div class="tv-hint"><span class="arrow">⇡</span><b>${t(`Deslizá el dado para tirarlo`)}</b></div>
         <button class="tv-alt" data-action="throwtap">${t(`o tocá acá para tirar`)}</button>`;
    return `<div class="throw-ov ${done ? 'done' : ''}">
      ${done ? '' : `<button class="tv-x" data-action="throwcancel" aria-label="${t('Cancelar')}">✕</button>`}
      <div class="tv-stage"><div class="tv-die">${die}</div></div>
      <div class="tv-bottom">${bottom}</div></div>`;
  },

  // Dado en 3D: cada cara muestra el atributo que le corresponde (1 Fuerza … 6 Carisma).
  dieCube(rolled, rolling) {
    const rot = { 1: [0, 0], 2: [0, -90], 3: [-90, 0], 4: [90, 0], 5: [0, 90], 6: [0, 180] };
    const [rx, ry] = rot[rolled] || [-20, 25];
    const faces = [1, 2, 3, 4, 5, 6]
      .map((n) => `<div class="face f${n}" style="--sc:var(--a-${DICE_TO_ATTR[n]})">${attrIcon(DICE_TO_ATTR[n])}</div>`)
      .join('') + [1, 2, 3, 4, 5, 6].map((n) => `<div class="core c${n}"></div>`).join('');
    const state = rolled ? (rolling ? 'rolling' : 'done') : 'idle';
    return `<div class="die3d ${state}" role="img" aria-label="${t('Dado')}${rolled ? ': ' + ATTR_NAMES[DICE_TO_ATTR[rolled]] : ''}"><div class="tilt"><div class="cube" style="--rx:${rx}deg;--ry:${ry}deg">${faces}</div></div></div>`;
  },

  revealCard(v, uid, side, res, fx) {
    const def = defOf(v, uid);
    const opts = { variant: 'reveal', uid, zoom: false };
    if (res && res.sides && res.sides[side]) {
      opts.values = res.sides[side].final;
      opts.attr = res.attr;
    } else if (v.duel && v.duel.attr) opts.attr = v.duel.attr;
    if (fx.includes('reveal') && side === foeSide) opts.cls = 'flip';
    return `<div class="peek" data-action="peek" data-num="${def.num}">${cardHTML(def, opts)}<span class="zoom-ic">${ICON.zoom}</span></div>`;
  },

  // ------------------------------------------------------------------ barra de acción
  actionBar(v, la) {
    const phase = v.phase;
    const d = v.duel;
    let prompt = '';
    let btn = '';
    const main = (label, action, cls = 'red', extra = '') => `<button class="mainbtn ${cls}" ${action ? `data-action="${action}"` : 'disabled'} ${extra}><span>${label}</span></button>`;
    if (phase === 'duel_roll') {
      prompt = t('Tirá el dado para sortear el atributo');
      btn = main(t('Tirar dado'), 'roll');
      if (la.dieMods && la.dieMods.loaded) btn += `<div class="dm-row"><button class="btn small cream" data-action="loadedmenu"><span>${t('Dado cargado')} ×${la.dieMods.loaded}</span></button></div>`;
    } else if (phase === 'duel_pick') {
      if (d.locked[me]) {
        prompt = d.locked[foeSide] ? t('Revelando…') : t('Esperando al rival…');
        btn = main(t('Esperando…'), null, 'grey');
      } else if (this.ui.selected) {
        const def = defOf(v, this.ui.selected);
        prompt = t('Atributo en juego: {attr}', { attr: esc(ATTR_NAMES[d.attr]) });
        btn = main(t('Jugar {card}', { card: esc(def.name) }), 'confirm');
      } else {
        prompt = t('Atributo en juego: {attr}', { attr: esc(ATTR_NAMES[d.attr]) });
        btn = main(t('Elegí una carta'), null, 'grey');
      }
      if (la.dieMods) {
        const dm = la.dieMods;
        btn += `<div class="dm-row">${dm.reroll ? `<button class="btn small cream" data-action="diemod" data-mod="reroll"><span>${t('Repetir dado')} ×${dm.reroll}</span></button>` : ''}${dm.boost ? `<button class="btn small cream" data-action="diemod" data-mod="boost"><span>${t('Refuerzo')} +10 ×${dm.boost}</span></button>` : ''}${dm.nudge ? `<button class="btn small cream" data-action="diemod" data-mod="nudge" data-dir="-1"><span>${t('Dado −1')}</span></button><button class="btn small cream" data-action="diemod" data-mod="nudge" data-dir="1"><span>${t('Dado +1')}</span></button>` : ''}</div>`;
      }
      if (la.desarme && !d.revealed) btn += `<button class="btn small cream" data-action="desarme"><span>${t('Desarmar efecto rival')}</span></button>`;
    } else if (phase === 'duel_choice') {
      prompt = la.choice ? t('Tenés una decisión pendiente') : t('El rival está decidiendo…');
      btn = main(la.choice ? t('Decidí') : t('Esperando…'), null, 'grey');
    } else if (phase === 'duel_result') {
      prompt = t('Duelo resuelto');
      btn = main(t('Ver resultado'), 'showresult', 'yellow');
    }
    return `<div class="b-action">${prompt ? `<div class="prompt">${prompt}</div>` : ''}${btn}</div>`;
  },

  dock(v, la) {
    const p = v.players[me];
    const hand = p.hand;
    const phase = v.phase;
    const d = v.duel;
    const canPick = phase === 'duel_pick' && la.playable.length > 0;
    const cards = hand
      .map((uid) => {
        const def = defOf(v, uid);
        const sel = this.ui.selected === uid;
        const opts = { variant: 'hand', uid, selected: sel, zoom: sel, attr: d && d.attr && phase !== 'round_intro' ? d.attr : null, dim: phase === 'duel_pick' && !canPick };
        return `<div class="hc" data-action="select" data-uid="${esc(uid)}" data-num="${def.num}">${cardHTML(def, opts)}</div>`;
      })
      .join('');
    const decks = p.active.reduce((s, a, i) => s + (i >= v.round ? a.length : 0), 0);
    return `<div class="dock">
      <div class="dock-hd"><div class="dk-title">${t('Tu mano')} <b>${hand.length}/${RULES.handSize}</b></div>
        <div class="dk-zones">
          ${this.zoneChip('reserve', ICON.deck, t('Reserva'), p.reserve.length)}
          ${this.zoneChip('discard', ICON.discard, t('Descarte'), p.discard.length)}
          ${this.zoneChip('decks', ICON.decks, t('Mazos'), decks)}
          ${this.zoneChip('active', ICON.star, t('Efectos'), p.activeZone.length, p.activeZone.length)}
        </div></div>
      <div class="b-hand" aria-label="${t('Tu mano')}">${hand.length ? cards : `<p class="note" style="opacity:.7;align-self:center">${t('No te quedan cartas en la mano.')}</p>`}</div>
    </div>`;
  },

  // ------------------------------------------------------------------ overlays de fase
  phaseOverlay(v, la) {
    if (v.phase === 'round_intro') return this.introOverlay(v);
    if (v.phase === 'duel_choice' && la.choice) return this.choiceSheet(v, la.choice);
    if (v.phase === 'duel_result' && this.ui.holding) return '';
    if (v.phase === 'duel_result' && !this.ui.hideResult) return this.ui.resultDetail ? this.resultSheet(v) : this.resultBanner(v);
    if (v.phase === 'round_result') return this.roundSheet(v);
    return '';
  },

  introOverlay(v) {
    const sc = scenarioDef(v.scenario.id);
    const notes = v.log.filter((l) => l.kind === 'scenario' && l.round === v.round).map((l) => `<p class="muted" style="margin-top:6px">${esc(l.text)}</p>`).join('');
    return `<div class="overlay center"><div class="sheet">
      <div class="sh-head"><h3>${t('Ronda {n}', { n: v.round })}</h3></div>
      <div class="sh-body">
        ${scenarioCardHTML(sc, { variant: 'full', width: 'min(100%, 340px)' })}${notes}
        <p class="muted" style="margin-top:8px">${t('Las 3 cartas de esta Ronda ya están en tu mano.')}</p>
      </div>
      <div class="sh-foot"><button class="btn red big" data-action="ack"><span>${t('¡A jugar!')}</span></button></div></div></div>`;
  },

  choiceSheet(v, choice) {
    const def = cardDef(choice.cardNum);
    const opts = eligibleSwap(v, me, choice);
    const dr = this.ui.draft;
    const list = (uids, key) =>
      `<div class="pick-row">${uids.map((u) => `<button class="pick ${dr[key] === u ? 'on' : ''}" data-action="draft" data-key="${key}" data-uid="${esc(u)}">${cardHTML(defOf(v, u), { variant: 'mini', uid: u })}</button>`).join('')}</div>`;
    const ready = dr.reserveUid && dr.activeUid;
    return `<div class="overlay"><div class="sheet">
      <div class="sh-head"><h3>${esc(td(choice.abilityName))}</h3></div>
      <div class="sh-body">
        <p><b>${esc(def.name)}</b>: ${esc(td(def.ability.text))}</p>
        <div class="sub-h">${t('1. Elegí una carta de tu Reserva')}</div>${list(opts.reserve, 'reserveUid')}
        <div class="sub-h">${t('2. Elegí la carta de un Mazo Activo que se va a la Reserva')}</div>${list(opts.active, 'activeUid')}
        <p class="muted">${choice.bonus ? t('Si lo hacés, obtenés +{n} a tus atributos en este duelo.', { n: choice.bonus }) : t('Las cartas intercambian de lugar.')}</p>
      </div>
      <div class="sh-foot"><button class="btn cream" data-action="choice" data-use="0"><span>${t('No usar')}</span></button>
        <button class="btn red" data-action="choice" data-use="1" ${ready ? '' : 'disabled'}><span>${t('Usar habilidad')}</span></button></div></div></div>`;
  },

  // Resultado del duelo sobre la mesa: sello grande en el estilo de la pantalla de batalla (detalles aparte).
  resultBanner(v) {
    const res = v.duel.resolution;
    const youWin = res.winner === me;
    const draw = !res.winner;
    const title = draw ? t('¡Empate!') : youWin ? t('¡Ganaste el duelo!') : t('Perdiste el duelo');
    const vals = res.sides && res.sides.p1
      ? `<div class="rb-vals"><span class="${res.winner === 'p2' ? 'w' : ''}">${res.sides.p2.value}</span><i>VS</i><span class="${res.winner === 'p1' ? 'w' : ''}">${res.sides.p1.value}</span></div>
         <div class="rb-attr" style="--sc:var(--a-${res.attr})" data-tip="${esc(ATTR_NAMES[res.attr])}">${attrIcon(res.attr)}</div>`
      : '';
    const w = roundDuelWins(v);
    const last = (res.winsRound && v.config.absoluteTieWinsRound) || v.duelIndex >= RULES.duelsPerRound - 1 || (v.config.earlyRoundEnd && (w.p1 >= 2 || w.p2 >= 2));
    const next = last ? t('Ver resultado de la Ronda') : t('Siguiente duelo');
    return `<div class="res-ov ${draw ? 'draw' : youWin ? 'win' : 'lose'}">
      <div class="rb-burst"></div>
      <div class="rb-stamp"><span>${esc(title)}</span></div>
      ${vals}
      <p class="rb-reason">${esc(res.reason)}</p>
      <div class="rb-btns"><button class="btn cream small" data-action="resdetail"><span>${t('Detalles')}</span></button><button class="btn red" data-action="ack"><span>${next}</span></button></div>
    </div>`;
  },

  resultSheet(v) {
    const res = v.duel.resolution;
    const youWin = res.winner === me;
    const w = roundDuelWins(v);
    const title = youWin ? t('¡Ganaste el duelo!') : t('Perdiste el duelo');
    let body = `<div class="banner ${youWin ? 'win' : 'lose'}">${esc(res.reason)}</div>`;
    if (res.sides && res.sides.p1) {
      const side = (s, who) => {
        const sd = res.sides[s];
        const def = cardDef(sd.cardNum);
        return `<div class="side ${res.winner === s ? 'win' : ''}"><div class="who">${who}</div><div class="nm">${esc(def.name)}</div>
          <div class="val">${sd.value}</div><div class="base"><span class="attr-chip" style="--sc:var(--a-${res.attr})">${attrIcon(res.attr)}</span> ${t('base')} ${sd.base[res.attr]}</div>
          <ul class="mods">${modsHTML(sd.entries)}</ul></div>`;
      };
      body += `<p style="margin-top:6px">${t('Atributo comparado')}: <span class="attr-chip" style="--sc:var(--a-${res.attr})" data-tip="${esc(ATTR_NAMES[res.attr])}">${attrIcon(res.attr)}</span>${res.attrOriginal && res.attrOriginal !== res.attr ? ` <span class="muted">(${t('salió')} <span class="attr-chip" style="--sc:var(--a-${res.attrOriginal})" data-tip="${esc(ATTR_NAMES[res.attrOriginal])}">${attrIcon(res.attrOriginal)}</span>)</span>` : ''}</p>
        <div class="cmp">${side('p2', t('Rival'))}<div class="mid">VS</div>${side('p1', t('Vos'))}</div>`;
    }
    const steps = [];
    if (res.redo) steps.push(esc(t('{card}: Carismático. Perdió por {margin} en {from}, así que se rehízo el duelo con {to}.', { card: res.redo.card, margin: res.redo.margin, from: ATTR_NAMES[res.redo.from], to: ATTR_NAMES[res.redo.to] })));
    if (res.tie) {
      if (res.tie.byAbility) steps.push(esc(t('Empate resuelto por la habilidad de {card}.', { card: res.tie.byAbility })));
      for (const r of res.tie.rerolls) steps.push(esc(t('Empate: nueva tirada ({rolls}) → se compara {attr}.', { rolls: r.rolls.map((x) => x.die).join(', '), attr: ATTR_NAMES[r.attr] })));
      if (res.tie.absolute) steps.push(t('Empate absoluto: desempate con la carta superior de la Reserva de cada jugador.'));
    }
    for (const n of res.notes || []) steps.push(esc(n));
    if (steps.length) body += `<div class="sub-h">${t('Qué pasó')}</div><ul class="step-list">${steps.map((s) => `<li>${s}</li>`).join('')}</ul>`;
    body += `<div class="sub-h">${t('Progreso de la Ronda')}</div><p>${t('Duelos ganados: Vos <b>{a}</b> — Rival <b>{b}</b> ({n} de {total} jugados)', { a: w.p1, b: w.p2, n: v.roundDuels.length, total: RULES.duelsPerRound })}</p>`;
    const last = (res.winsRound && v.config.absoluteTieWinsRound) || v.duelIndex >= RULES.duelsPerRound - 1 || (v.config.earlyRoundEnd && (w.p1 >= 2 || w.p2 >= 2));
    const next = last ? t('Ver resultado de la Ronda') : t('Siguiente duelo');
    return `<div class="overlay"><div class="sheet">
      <div class="sh-head"><h3>${title}</h3></div>
      <div class="sh-body">${body}</div>
      <div class="sh-foot"><button class="btn cream small" data-action="resdetail"><span>${t('Volver')}</span></button><button class="btn red" data-action="ack"><span>${next}</span></button></div></div></div>`;
  },

  // Repaso de los duelos de la Ronda: contra qué carta ganaste o perdiste.
  roundRecap(r) {
    if (!r.duels || !r.duels.length) return '';
    const nm = (n) => (n ? esc(cardDef(n).name) : '—');
    const val = (x) => (x == null ? '' : `<b>${x}</b>`);
    const rows = r.duels.map((x, i) => `<div class="rc ${x.winner === me ? 'win' : x.winner ? 'lose' : ''}">
      <span class="rc-n">${i + 1}</span><span class="rc-at attr-chip" style="--sc:var(--a-${x.attr})">${attrIcon(x.attr)}</span>
      <span class="rc-c me">${nm(x.cards[me])} ${val(x.values[me])}</span><span class="rc-vs">VS</span><span class="rc-c foe">${nm(x.cards[foeSide])} ${val(x.values[foeSide])}</span></div>`).join('');
    return `<div class="recap"><div class="sub-h">${t('Así se jugó')}</div>${rows}</div>`;
  },

  roundSheet(v) {
    const r = v.roundResults[v.roundResults.length - 1];
    const youWin = r.winner === me;
    const sc = scenarioDef(r.scenarioId);
    const gameEnds = v.roundWins.p1 >= RULES.roundsToWin || v.roundWins.p2 >= RULES.roundsToWin || v.roundsCompleted >= RULES.totalRounds;
    return `<div class="overlay center"><div class="sheet">
      <div class="sh-head"><h3>${t('Fin de la Ronda {n}', { n: r.round })}</h3></div>
      <div class="sh-body" style="text-align:center">
        <div class="result-title ${youWin ? 'win' : 'lose'}">${youWin ? t('¡Ganaste la Ronda!') : t('El rival ganó la Ronda')}</div>
        <p>${t('Duelos: Vos <b>{a}</b> — Rival <b>{b}</b>', { a: r.duelWins.p1, b: r.duelWins.p2 })}${r.byTiebreak ? `<br><span class="muted">${t('Definido por empate absoluto.')}</span>` : ''}</p>
        <p style="margin-top:10px">${t('Marcador de Rondas')}</p>
        <div class="scoreline" style="font-family:var(--font-display);font-size:2.4rem">${t('Vos')} ${v.roundWins.p1} — ${v.roundWins.p2} ${t('Rival')}</div>
        ${this.roundRecap(r)}
        <p class="muted" style="margin-top:8px">${t('Escenario: {name}. Las cartas que quedaron en mano pasan al fondo de la Reserva.', { name: esc(sc.name) })}</p>
      </div>
      <div class="sh-foot"><button class="btn red big" data-action="ack"><span>${gameEnds ? t('Ver resultado final') : t('Siguiente Ronda')}</span></button></div></div></div>`;
  },

  endScreen(v, ctx) {
    const win = v.winner === me;
    if (ctx && ctx.mode === 'adventure') {
      return `<div class="screen big-end">
      <div class="stamp ${win ? '' : 'lose'}">${win ? t('¡Victoria!') : t('Derrota')}</div>
      <div class="scoreline">${t('Vos')} ${v.roundWins.p1} — ${v.roundWins.p2} ${t('Rival')}</div>
      <p style="max-width:300px;opacity:.9">${win ? t('Ganaste el combate.') : t('Perdiste el combate: te cuesta una vida.')}</p>
      <button class="btn red big" data-action="advdone"><span>${t('Seguir')}</span></button></div>`;
    }
    return `<div class="screen big-end">
      <div class="stamp ${win ? '' : 'lose'}">${win ? t('¡Victoria!') : t('Derrota')}</div>
      <div class="scoreline">${t('Vos')} ${v.roundWins.p1} — ${v.roundWins.p2} ${t('Rival')}</div>
      <p style="max-width:300px;opacity:.9">${win ? t('¡Capitán Barato estaría orgulloso! Ganaste la partida.') : t('Esta vez ganó el rival. La próxima salen mejor los dados.')}</p>
      ${this.ui.earned ? `<p style="font-family:var(--font-display);font-size:1.6rem;color:var(--yellow);margin:0">${t('+{n} monedas', { n: this.ui.earned })}</p>` : ''}
      <div style="display:flex;flex-direction:column;gap:14px;width:100%;max-width:320px">
        <button class="btn red big" data-action="again"><span>${t('Jugar otra vez')}</span></button>
        <button class="btn cream" data-action="go" data-to="setup"><span>${t('Cambiar de mazo')}</span></button>
        <button class="btn ghost small" data-action="go" data-to="menu"><span>${t('Menú principal')}</span></button>
      </div></div>`;
  },

  // ------------------------------------------------------------------ overlays del usuario
  userOverlay(v) {
    const o = this.ui.overlay;
    if (!o) return '';
    const close = `<button class="icon-btn" data-action="closeoverlay" aria-label="${t('Cerrar')}">${ICON.close}</button>`;
    const wrap = (title, body, foot = '') => `<div class="overlay"><div class="sheet"><div class="sh-head"><h3>${esc(title)}</h3>${close}</div><div class="sh-body">${body}</div>${foot}</div></div>`;
    if (o.type === 'scenario') {
      const sc = scenarioDef(v.scenario.id);
      return wrap(sc.name, `${scenarioCardHTML(sc, { variant: 'full', width: 'min(100%, 340px)' })}${v.scenarioFlags.bannedAttrs ? `<p style="margin-top:6px"><b>${t('Anulados')}:</b> ${v.scenarioFlags.bannedAttrs.map((a) => ATTR_NAMES[a]).join(t(' y '))}</p>` : ''}`);
    }
    if (o.type === 'log') {
      const items = v.log.slice().reverse().map((l) => `<li class="${esc(l.kind)}">${esc(l.text)}</li>`).join('');
      return wrap(t('Registro'), `<ul class="log-list">${items}</ul>`);
    }
    if (o.type === 'card') {
      const def = cardDef(o.num);
      return `<div class="overlay" data-action="closeoverlay"><div class="detail-wrap">${cardHTML(def, { variant: 'full' })}<button class="btn" data-action="closeoverlay"><span>${t('Cerrar')}</span></button></div></div>`;
    }
    if (o.type === 'quit') {
      return `<div class="overlay center"><div class="sheet"><div class="sh-head"><h3>${t('¿Abandonar?')}</h3></div><div class="sh-body"><p>${this.ui.adv ? t('Si salís, perdés este combate y una vida.') : t('Si salís, esta partida se pierde.')}</p></div>
        <div class="sh-foot"><button class="btn cream" data-action="closeoverlay"><span>${t('Seguir jugando')}</span></button><button class="btn red" data-action="${this.ui.adv ? 'advforfeit' : 'go'}" data-to="menu"><span>${t('Salir')}</span></button></div></div></div>`;
    }
    if (o.type === 'loaded') {
      const banned = v.scenarioFlags.bannedAttrs || [];
      const btns = ATTRS.map((a) => `<button class="btn cream loadbtn ${banned.includes(a) ? 'dim' : ''}" data-action="loadpick" data-attr="${a}" style="--sc:var(--a-${a})"><span>${attrIcon(a)} ${esc(ATTR_NAMES[a])}</span></button>`).join('');
      return wrap(t('Dado cargado'), `<p>${t('Elegí el atributo del duelo sin tirar el dado.')}</p><div class="load-grid">${btns}</div>`);
    }
    if (o.type === 'zone') return this.zoneOverlay(v, o.zone, wrap);
    return '';
  },

  zoneOverlay(v, zone, wrap) {
    const mine = v.players[me];
    const f = v.players[foeSide];
    const minis = (uids, topBadge) => uids.length
      ? `<div class="pick-row">${uids.map((u, i) => `<div data-action="peek" data-num="${defOf(v, u).num}">${cardHTML(defOf(v, u), { variant: 'mini', uid: u, badge: topBadge && i === 0 ? t('Arriba') : '' })}</div>`).join('')}</div>`
      : `<p class="muted">${t('Vacío.')}</p>`;
    const activeList = (list) => list.length
      ? list.map((u) => { const d = defOf(v, u); return `<div class="panel" style="margin-top:8px"><h3>${esc(d.name)} · ${esc(td(d.active.name))}</h3><p>${esc(td(d.active.text))}</p></div>`; }).join('')
      : `<p class="muted">${t('No hay Efecto Activo.')}</p>`;
    switch (zone) {
      case 'reserve': return wrap(t('Tu Reserva ({n})', { n: mine.reserve.length }), `<p class="muted">${t('De arriba hacia abajo: la primera es la carta superior. Sólo vos ves tu Reserva.')}</p>${minis(mine.reserve, true)}`);
      case 'discard': return wrap(t('Tu descarte ({n})', { n: mine.discard.length }), minis(mine.discard));
      case 'active': return wrap(t('Tu Efecto Activo'), activeList(mine.activeZone));
      case 'decks': {
        const parts = [];
        for (let i = v.round; i < RULES.totalRounds; i++) parts.push(`<div class="sub-h">${t('Mazo Activo de la Ronda {n}', { n: i + 1 })}</div>${minis(mine.active[i])}`);
        return wrap(t('Tus Mazos Activos'), parts.length ? parts.join('') : `<p class="muted">${t('Ya no quedan Mazos Activos por jugar.')}</p>`);
      }
      case 'foeReserve': return wrap(t('Reserva del rival'), `<p>${t('La Reserva del rival está oculta. Tiene <b>{n}</b> cartas.', { n: f.counts.reserve })}</p>`);
      case 'foeDiscard': return wrap(t('Descarte del rival ({n})', { n: f.discard.length }), minis(f.discard));
      case 'foeActive': return wrap(t('Efecto Activo del rival'), activeList(f.activeZone));
      default: return '';
    }
  },

  // ------------------------------------------------------------------ acciones
  doThrow(ctx) {
    const ui = this.ui;
    if (ui.throwBusy) return;
    const r = ctx.controller.submit({ type: 'ROLL' });
    if (!r.ok) { ctx.toast(r.error); ui.throwOpen = false; ctx.rerender(true); return; }
    ui.throwBusy = true;
    ui.throwAt = Date.now();
    Sound.fx('throw');
    ctx.rerender(true);
    setTimeout(() => { ui.throwBusy = false; ui.throwOpen = false; ctx.rerender(true); }, 2000);
  },

  // Gesto: el dado sigue al dedo y, si se lo suelta con impulso, se tira.
  bindThrow(ctx) {
    if (this.bound) return;
    this.bound = true;
    let st = null;
    const die = () => document.querySelector('.throw-ov .tv-die');
    document.addEventListener('pointerdown', (e) => {
      const ov = e.target.closest && e.target.closest('.throw-ov:not(.done)');
      if (!ov || e.target.closest('button')) return;
      st = { x: e.clientX, y: e.clientY, t: performance.now(), px: e.clientX, py: e.clientY, pt: performance.now(), vx: 0, vy: 0 };
    });
    document.addEventListener('pointermove', (e) => {
      if (!st) return;
      const now = performance.now();
      const dt = Math.max(1, now - st.pt);
      st.vx = (e.clientX - st.px) / dt; st.vy = (e.clientY - st.py) / dt;
      st.px = e.clientX; st.py = e.clientY; st.pt = now;
      const el = die();
      if (el) { el.style.transition = 'none'; el.style.transform = `translate(${e.clientX - st.x}px, ${e.clientY - st.y}px) rotate(${(e.clientX - st.x) / 8}deg)`; }
    });
    const end = (e) => {
      if (!st) return;
      const s = st; st = null;
      const dist = Math.hypot(e.clientX - s.x, e.clientY - s.y);
      const speed = Math.hypot(s.vx, s.vy);
      const el = die();
      if (dist > 50 && (speed > 0.35 || dist > 120)) {
        if (el) { el.style.transition = 'transform .25s ease-out'; el.style.transform = `translate(${s.vx * 120}px, ${s.vy * 120}px) scale(0.9)`; }
        this.doThrow(ctx);
      } else if (el) {
        el.style.transition = 'transform .25s cubic-bezier(.3,1.6,.5,1)';
        el.style.transform = '';
        const h = document.querySelector('.throw-ov .tv-hint');
        if (h) { h.classList.remove('nudge'); void h.offsetWidth; h.classList.add('nudge'); }
      }
    };
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', end);
  },

  onAction(action, el, ctx) {
    const c = ctx.controller;
    const ui = this.ui;
    this.bindThrow(ctx);
    const send = (a) => {
      const r = c.submit(a);
      if (!r.ok) ctx.toast(r.error);
      return r;
    };
    switch (action) {
      case 'select': {
        const v = c.view();
        if (v.phase !== 'duel_pick' || v.duel.locked.p1) { ui.selected = null; ctx.rerender(true); return true; }
        ui.selected = ui.selected === el.dataset.uid ? null : el.dataset.uid;
        ctx.rerender(true);
        return true;
      }
      case 'zoom':
      case 'peek':
        ui.overlay = { type: 'card', num: Number(el.dataset.num) };
        ctx.rerender(true);
        return true;
      case 'confirm':
        if (ui.selected) { const uid = ui.selected; send({ type: 'PLAY_CARD', uid }); }
        return true;
      case 'roll': ui.throwOpen = true; ctx.rerender(true); return true;
      case 'throwcancel': ui.throwOpen = false; ctx.rerender(true); return true;
      case 'throwtap': this.doThrow(ctx); return true;
      case 'desarme': send({ type: 'USE_DESARME' }); return true;
      case 'loadedmenu': ui.overlay = { type: 'loaded' }; ctx.rerender(true); return true;
      case 'loadpick': ui.overlay = null; send({ type: 'USE_DIE_MOD', mod: 'loaded', attr: el.dataset.attr }); return true;
      case 'diemod': send({ type: 'USE_DIE_MOD', mod: el.dataset.mod, dir: Number(el.dataset.dir) || 1 }); return true;
      case 'advdone': ctx.adventureDone({ won: ctx.controller.view().winner === me, roundsWon: ctx.controller.view().roundWins.p1, modsLeft: ctx.controller.view().dieMods.p1 }); return true;
      case 'advforfeit': ctx.adventureDone({ won: false, roundsWon: 0, modsLeft: ctx.controller.state ? ctx.controller.view().dieMods.p1 : null }); return true;
      case 'ack': send({ type: 'ACK' }); return true;
      case 'resdetail': ui.resultDetail = !ui.resultDetail; ctx.rerender(true); return true;
      case 'hideresult': ui.hideResult = true; ctx.rerender(true); return true;
      case 'showresult': ui.hideResult = false; ctx.rerender(true); return true;
      case 'draft': ui.draft[el.dataset.key] = ui.draft[el.dataset.key] === el.dataset.uid ? null : el.dataset.uid; ctx.rerender(true); return true;
      case 'choice': {
        const la = legalActions(c.view(), me);
        if (!la.choice) return true;
        const use = el.dataset.use === '1';
        send({ type: 'RESOLVE_CHOICE', id: la.choice.id, use, reserveUid: ui.draft.reserveUid, activeUid: ui.draft.activeUid });
        ui.draft = {};
        return true;
      }
      case 'overlay': ui.overlay = { type: el.dataset.type }; ctx.rerender(true); return true;
      case 'zone': ui.overlay = { type: 'zone', zone: el.dataset.zone }; ctx.rerender(true); return true;
      case 'quit': ui.overlay = { type: 'quit' }; ctx.rerender(true); return true;
      case 'closeoverlay': ui.overlay = null; ctx.rerender(true); return true;
      case 'again': ctx.startGame(ctx.lastDeck); return true;
      case 'tutnext':
      case 'tutskip': return tutorialAction(action, ui, ctx);
      default: return false;
    }
  },

  afterRender(app) { coachAfterRender(app, this.ui); },
};
