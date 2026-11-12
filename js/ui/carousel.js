// Carrusel horizontal de cartas en bucle (loop): con el dedo el desplazamiento es nativo (inercia + imán), la carta más cercana
// al centro se selecciona en cada instante (aunque pases rápido) y se agranda de forma continua según qué tan cerca está del centro.
// Las animaciones propias (flechas, tocar una lateral, soltar el mouse) usan una curva exponencial de salida.
// No toca el estado del juego: sólo avisa qué carta quedó seleccionada (onSelect) y cuándo hay que abrirla grande (onOpen).
const COPIES = 3; // se dibuja el mazo 3 veces; al quedar quieto se vuelve a la copia del medio sin que se note

export function carouselHTML(items, selNum, { leftLabel = '', rightLabel = '' } = {}) {
  let li = '';
  for (let c = 0; c < COPIES; c++) {
    li += items.map((o) => `<div class="ri ${c === 1 && o.num === selNum ? 'sel' : ''} ${o.sold ? 'sold' : ''}" data-rnum="${o.num}" data-copy="${c}">${o.html}</div>`).join('');
  }
  return `<div class="car"><button class="nav l" data-rnav="-1" aria-label="${leftLabel}">‹</button><div class="rail" tabindex="0">${li}</div><button class="nav r" data-rnav="1" aria-label="${rightLabel}">›</button></div>`;
}

const centerOf = (rail, el) => el.offsetLeft - (rail.clientWidth - el.offsetWidth) / 2;
const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const smooth = (x) => x * x * (3 - 2 * x); // 0..1 -> curva suave (arranca y termina despacio)

let offGlobal = null;
export function initCarousel(root, onSelect, onOpen = () => {}) {
  if (offGlobal) { offGlobal(); offGlobal = null; }
  const rail = root.querySelector('.rail');
  if (!rail) return;
  const items = [...rail.querySelectorAll('.ri')];
  if (!items.length) return;
  const n = items.length / COPIES;
  let cur = items.find((i) => i.classList.contains('sel')) || items[n];
  rail.scrollLeft = centerOf(rail, cur); // posición inicial sin animación

  let anim = 0, dragging = false, idleT = 0;
  const setW = () => geo[n].c - geo[0].c; // ancho de una copia completa

  // Escala/brillo continuos: --p vale 1 en el centro y baja a 0 a un paso de distancia.
  // Para que sea fluido NO se lee el layout en cada cuadro: las posiciones se guardan una vez (y al cambiar el tamaño)
  // y en cada cuadro sólo se tocan las 5 o 6 cartas cercanas al centro.
  let geo = [];
  const measure = () => { geo = items.map((it) => ({ c: it.offsetLeft + it.offsetWidth / 2, w: it.offsetWidth })); };
  measure();
  // Si el navegador ya anima el efecto con el desplazamiento (CSS), no hace falta escribir --p desde JS.
  const cssDriven = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('animation-timeline', 'view()');
  const lastP = new Float32Array(items.length);
  const near = new Set();
  let selTimer = 0;
  const announce = () => { clearTimeout(selTimer); selTimer = setTimeout(() => onSelect(Number(cur.dataset.rnum)), 70); };
  const paint = () => {
    const mid = rail.scrollLeft + rail.clientWidth / 2;
    let best = -1, bd = Infinity;
    const keep = new Set();
    // sólo las cartas dentro de ±2 pasos del centro; el resto queda en reposo (p = 0)
    const step = geo[0].w * 1.2;
    const k = Math.round((mid - geo[0].c) / (geo[1] ? geo[1].c - geo[0].c : step));
    const lo = Math.max(0, k - 3), hi = Math.min(items.length - 1, k + 3);
    for (let i = lo; i <= hi; i++) {
      const d = Math.abs(geo[i].c - mid);
      const p = smooth(Math.max(0, 1 - d / (geo[i].w * 1.15)));
      if (!cssDriven && Math.abs(p - lastP[i]) > 0.003) { lastP[i] = p; items[i].style.setProperty('--p', p.toFixed(3)); }
      keep.add(i);
      if (d < bd) { bd = d; best = i; }
    }
    if (!cssDriven) for (const i of near) if (!keep.has(i) && lastP[i] !== 0) { lastP[i] = 0; items[i].style.setProperty('--p', '0'); }
    near.clear(); keep.forEach((i) => near.add(i));
    if (best >= 0 && items[best] !== cur) {
      cur.classList.remove('sel'); items[best].classList.add('sel'); cur = items[best];
      announce();
    }
  };
  let raf = 0;
  const onScroll = () => {
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; paint(); });
    clearTimeout(idleT);
    idleT = setTimeout(recenterLoop, 140);
  };
  rail.addEventListener('scroll', onScroll, { passive: true });
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { measure(); paint(); }) : null;
  if (ro) ro.observe(rail);
  paint();

  // Bucle: si quedó quieto en la primera o la última copia, se salta a la copia del medio (idéntica) sin que se vea.
  function recenterLoop() {
    if (dragging || anim) return;
    const c = Number(cur.dataset.copy);
    if (c === 1) return;
    const twin = items[n + items.indexOf(cur) % n];
    const snap = rail.style.scrollSnapType;
    rail.style.scrollSnapType = 'none';
    rail.scrollLeft += setW() * (c === 0 ? 1 : -1);
    cur.classList.remove('sel'); twin.classList.add('sel'); cur = twin;
    requestAnimationFrame(() => { rail.style.scrollSnapType = snap; paint(); });
  }

  // Animación propia con salida exponencial (suave al final), cancelable por el usuario.
  const stopAnim = () => { if (anim) { cancelAnimationFrame(anim); anim = 0; rail.classList.remove('anim'); } };
  const animateTo = (left, ms = 520) => {
    stopAnim();
    const from = rail.scrollLeft; const dist = left - from;
    if (Math.abs(dist) < 1) return;
    rail.classList.add('anim'); // sin imán mientras dura
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      rail.scrollLeft = from + dist * easeOutExpo(t);
      if (t < 1) anim = requestAnimationFrame(step); else { anim = 0; rail.classList.remove('anim'); paint(); recenterLoop(); }
    };
    anim = requestAnimationFrame(step);
  };
  const goTo = (it) => animateTo(centerOf(rail, it));
  ['touchstart', 'wheel'].forEach((ev) => rail.addEventListener(ev, stopAnim, { passive: true }));

  // Tocar una carta lateral la lleva al centro. Tocar la del centro la abre grande. Nunca compra.
  let dragged = false, suppressClick = false;
  rail.addEventListener('click', (e) => {
    if (dragged) { dragged = false; return; }
    if (suppressClick) { suppressClick = false; return; }
    const it = e.target.closest('.ri');
    if (!it) return;
    if (it !== cur) goTo(it); else onOpen(Number(it.dataset.rnum));
  });

  // Mantener apretada una carta también la abre grande.
  let pressT = null, pressXY = null;
  const cancelPress = () => { clearTimeout(pressT); pressT = null; };
  rail.addEventListener('pointerdown', (e) => {
    const it = e.target.closest('.ri'); if (!it) return;
    pressXY = [e.clientX, e.clientY]; cancelPress();
    pressT = setTimeout(() => { pressT = null; suppressClick = true; if (it !== cur) goTo(it); onOpen(Number(it.dataset.rnum)); }, 520);
  });
  rail.addEventListener('pointermove', (e) => { if (pressT && pressXY && Math.hypot(e.clientX - pressXY[0], e.clientY - pressXY[1]) > 8) cancelPress(); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => rail.addEventListener(ev, cancelPress));
  rail.addEventListener('scroll', cancelPress, { passive: true });

  // Flechas discretas y teclado: de a una carta, con bucle.
  const step1 = (d) => { const i = items.indexOf(cur) + d; goTo(items[Math.max(0, Math.min(items.length - 1, i))]); };
  root.querySelectorAll('[data-rnav]').forEach((b) => b.addEventListener('click', () => step1(Number(b.dataset.rnav))));
  rail.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    step1(e.key === 'ArrowRight' ? 1 : -1); e.preventDefault();
  });

  // Mouse: arrastrar para recorrer (con el dedo y el trackpad el desplazamiento ya es nativo).
  let down = null;
  rail.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    stopAnim();
    down = { x: e.clientX, left: rail.scrollLeft, moved: false };
    rail.classList.add('drag'); dragging = true;
  });
  const onMove = (e) => {
    if (!down) return;
    const dx = e.clientX - down.x;
    if (Math.abs(dx) > 5) down.moved = true;
    if (down.moved) rail.scrollLeft = down.left - dx;
  };
  const onUp = () => {
    if (!down) return;
    const moved = down.moved; down = null; dragging = false;
    rail.classList.remove('drag');
    if (moved) { dragged = true; setTimeout(() => { dragged = false; }, 50); goTo(cur); }
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  offGlobal = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); stopAnim(); clearTimeout(idleT); clearTimeout(selTimer); if (ro) ro.disconnect(); };
}
