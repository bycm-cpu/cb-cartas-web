// Piezas visuales comunes (cabecera de cartel, monedas, etiquetas) para que todas las pantallas se vean igual.
import { esc } from './util.js';
import { ICON } from './icons.js';
import { t } from '../i18n.js';

// Cabecera: botón de volver redondo, título en cartel rojo inclinado y un lugar a la derecha (monedas, etc.).
export function header({ title, sub = '', back = 'menu', backAction = 'go', right = '', art = '' } = {}) {
  const backAttr = backAction === 'go' ? `data-action="go" data-to="${esc(back)}"` : `data-action="${esc(backAction)}" data-v="${esc(back)}"`;
  const bg = art ? ` style="--hdr-art:${art}"` : '';
  return `<div class="hdr ${art ? 'has-art' : ''}"${bg}>
    ${back === null ? '' : `<button class="icon-btn" ${backAttr} aria-label="${t('Volver')}">${ICON.back}</button>`}
    <div class="hdr-t"><h2><span>${esc(title)}</span></h2>${sub ? `<p>${esc(sub)}</p>` : ''}</div>
    ${right ? `<div class="hdr-r">${right}</div>` : ''}
  </div>`;
}

export const coinChip = (n) => `<span class="coin-chip"><i></i><b>${n}</b></span>`;
export const gemChip = (n) => `<span class="coin-chip gem"><i></i><b>${n}</b></span>`;

// Etiqueta de sección (cartel rojo + subtítulo).
export const ribbon = (title, sub = '') => `<div class="rib"><span class="rib-t">${esc(title)}</span>${sub ? `<span class="rib-s">${esc(sub)}</span>` : ''}</div>`;

// Etiqueta de precio amarilla, como en las vitrinas de la tienda.
export const priceTag = (n, cls = '') => `<span class="ptag ${cls}"><i></i><b>${n}</b></span>`;
