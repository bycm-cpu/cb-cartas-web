// Componente de carta reutilizable. Variantes: full, hand, reveal, mini, back.
// La carta sólo recibe datos (definición + opciones): ninguna regla vive acá.
import { ATTRS, ATTR_NAMES, ATTR_SHORT, normalizeClass } from '../data/constants.js';
import { t, td } from '../i18n.js';
import { CLASS_THEME } from '../data/cards.js';
import { esc, pad3, signed } from './util.js';
import { attrIcon, ICON } from './icons.js';
import { glossary } from '../data/glossary.js';

function themeOf(def) {
  const first = (def.classes && def.classes[0]) || '';
  return CLASS_THEME[normalizeClass(first)] || 'urbano';
}

function statsHTML(def, opts) {
  const vals = opts.values || def.stats;
  return ATTRS.map((a) => {
    const v = vals[a];
    const base = def.stats[a];
    const delta = opts.values ? v - base : 0;
    const cls = ['stat', `s-${a}`];
    if (opts.attr === a) cls.push('hl');
    if (delta > 0) cls.push('up');
    if (delta < 0) cls.push('down');
    return `<div class="${cls.join(' ')}" ${opts.tips ? `data-tip="${esc(ATTR_NAMES[a])}"` : ''}>${attrIcon(a)}<b>${v}</b></div>`;
  }).join('');
}

const artHTML = (def, extra = '') =>
  `<div class="c-art"><img src="${esc(def.art)}" alt="" loading="lazy" draggable="false" onerror="this.parentNode.classList.add('noart');this.remove()"><span class="ph">${t('Ilustración provisional')}</span>${extra}</div>`;

// Marca los términos del glosario dentro de un texto ya escapado: al tocarlos se explica qué significan.
export function kwify(html) {
  let out = html;
  for (const [term, text] of glossary()) {
    const re = new RegExp(`(^|[^\\wÁÉÍÓÚáéíóúñ>])(${term})(?![\\wáéíóúñ])`, 'g');
    out = out.replace(re, (m, pre, w) => `${pre}<span class="kw" data-tip="${esc(text)}">${w}</span>`);
  }
  return out;
}

// Los nombres largos se achican para que entren en la franja roja.
const tf = (x) => (x.length <= 70 ? 1.4 : x.length <= 100 ? 1.2 : x.length <= 130 ? 1.08 : .98);
const nameScale = (x) => (x.length > 22 ? .72 : x.length > 16 ? .85 : 1);
// Tamaño del nombre según su palabra más larga (siempre dentro del encabezado, hasta 2 líneas).
const nameSize = (n) => { const w = Math.max(...n.split(/\s+/).map((x) => x.length)); let f = w <= 6 ? 2.1 : w <= 8 ? 1.8 : w <= 10 ? 1.5 : 1.25; if (/\s/.test(n)) f = Math.min(f, 1.8); if (n.length > 16) f = Math.min(f, 1.2); return f; };
const nameClass = (name) => (name.length > 18 ? 'nl3' : name.length > 11 ? 'nl2' : '');

export function cardHTML(def, opts = {}) {
  const variant = opts.variant || 'hand';
  const theme = themeOf(def);
  if (variant === 'back') return backHTML({ cls: opts.cls });
  const cls = ['card', `v-${variant}`, `t-${theme}`];
  if (opts.selected) cls.push('sel');
  if (opts.dim) cls.push('dim');
  if (opts.cls) cls.push(opts.cls);
  const classes = (def.classes || []).map(td).join(' / ') || '—';
  const ability = def.ability;
  const longText = variant === 'full';
  
  const dataAttrs = `${opts.uid ? `data-uid="${esc(opts.uid)}"` : ''} data-num="${def.num}"`;
  // Diseño de carta: ilustración grande, banda roja con el nombre, clase arriba a la derecha, atributos en columna
  // a la derecha y recuadro de habilidad abajo (el texto largo sólo en la carta completa).
  const tips = !!opts.tips || longText;
  const abilTip = ability && !longText && opts.tips ? ` data-tip="${esc(td(ability.text))}"` : '';
  const star = def.active ? `<span class="c-star" ${tips ? `data-tip="${esc(td(def.active.name))}"` : ''}>${ICON.star}</span>` : '';
  const abilityBox = ability
    ? `<div class="c-abil"><span class="c-tab">${t('Habilidad')}</span><h4${abilTip} style="--hs:${nameScale(td(ability.name))}">${esc(td(ability.name))}</h4><p style="--tf:${tf(td(ability.text))}em">${kwify(esc(td(ability.text)))}</p></div>`
    : `<div class="c-abil none"><span class="c-tab">${t('Sin habilidad')}</span></div>`;
  const extra = longText && def.active
    ? `<div class="detail-extra"><h5>★ ${t('Efecto Activo')} · ${esc(td(def.active.name))}</h5><p>${kwify(esc(td(def.active.text)))}</p></div>`
    : '';
  const artStyle = def.artPos ? ` style="--art-pos:${esc(def.artPos)}"` : '';
  const card = `<div class="${cls.join(' ')} nv" ${dataAttrs}>
    <div class="c-paper"${artStyle}>
      <div class="c-head"><span class="c-no">${t('Nº')} ${pad3(def.num)}</span><div class="c-name"><span style="--nf:${nameSize(def.name)}">${esc(def.name)}</span></div><div class="c-tag" ${tips ? `data-tip="${esc(classes)}"` : ''}><span>${esc(classes).replace(/ \/ /g, '<br>')}</span></div></div>
      ${artHTML(def, `<div class="c-stats">${statsHTML(def, { ...opts, tips })}</div>`)}
      ${abilityBox}
      <div class="c-foot"><span class="c-obra"><b>${t('Obra')}</b>${esc(def.obra)}</span>${star}</div>
    </div>
    ${opts.badge ? `<div class="c-badge">${esc(opts.badge)}</div>` : ''}
    ${opts.zoom ? `<button class="c-zoom" data-action="zoom" data-uid="${esc(opts.uid || '')}" data-num="${def.num}" aria-label="${t('Ver carta completa')}">${ICON.zoom}</button>` : ''}
  </div>`;
  return card + extra;
}

export function backHTML({ cls = '', style = '' } = {}) {
  return `<div class="card v-back ${cls}" ${style ? `style="${style}"` : ''}><div class="back-in"></div></div>`;
}

export function modsHTML(entries) {
  if (!entries || !entries.length) return `<li class="none">${t('Sin modificaciones.')}</li>`;
  return entries
    .map((e) => {
      const cls = e.removed ? 'void' : e.amount > 0 ? 'plus' : 'minus';
      const note = e.removed ? ` <em>(${esc(e.removed)})</em>` : e.detail ? ` <em>(${esc(e.detail)})</em>` : '';
      return `<li class="${cls}"><b>${signed(e.amount)}</b> ${esc(e.label)}${note}</li>`;
    })
    .join('');
}

// Carta de escenario: carta HORIZONTAL (7:5). variant: 'full' (nombre, provincia, tipo y efecto), 'art' (sólo ilustración + nombre), 'tiny' (sólo ilustración).
// El tamaño lo da el contenedor .scw (ancho); la carta escala sola.
export function scenarioCardHTML(sc, { variant = 'full', width = '' } = {}) {
  const e = esc;
  const ty = td(sc.type);
  return `<div class="scw" ${width ? `style="width:${width}"` : ''}><div class="scard ${variant}"><div class="sc-in">
    <div class="sc-art"><img src="${e(sc.art)}" alt="" loading="lazy"><span class="sc-name" style="font-size:${sc.name.length > 20 ? 1.0 : sc.name.length > 14 ? 1.15 : 1.4}em">${e(sc.name)}</span><span class="sc-prov">${e(sc.province)}</span></div>
    <div class="sc-tx"><span class="sc-ty">${e(ty)}</span><span class="sc-fx">${e(td(sc.text))}</span></div></div></div></div>`;
}
