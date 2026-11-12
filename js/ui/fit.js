// Ajusta la escala de cada carta: la carta se dibuja a tamaño de diseño (630 px) y se reduce con transform.
// Mantiene --k = ancho real / 630 en cada .card.nv, también si cambia de tamaño o aparece más tarde (detalle, carrusel, ventanas).
const DESIGN_W = 630;
const seen = new WeakSet();
const fit = (c) => { const w = c.offsetWidth; if (w) c.style.setProperty('--k', (w / DESIGN_W).toFixed(5)); };
const ro = typeof ResizeObserver === 'function' ? new ResizeObserver((es) => es.forEach((e) => fit(e.target))) : null;
const watch = (c) => { if (seen.has(c)) return; seen.add(c); if (ro) ro.observe(c); fit(c); };
const scan = (n) => {
  if (n.nodeType !== 1) return;
  if (n.matches && n.matches('.card.nv')) watch(n);
  if (n.querySelectorAll) n.querySelectorAll('.card.nv').forEach(watch);
};
export function initCardFit() {
  document.querySelectorAll('.card.nv').forEach(watch);
  new MutationObserver((muts) => muts.forEach((m) => m.addedNodes.forEach(scan))).observe(document.body, { childList: true, subtree: true });
}
