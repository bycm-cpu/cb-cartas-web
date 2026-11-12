// Generador pseudoaleatorio determinista (mulberry32). El estado del RNG vive dentro del estado de
// la partida (state.rngState) para que una partida sea reproducible a partir de la semilla y de la
// lista de acciones: base necesaria para el PvP futuro y para las pruebas.

export function nextFloat(state) {
  state.rngState = (state.rngState + 0x6d2b79f5) >>> 0;
  let t = state.rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randInt(state, n) {
  return Math.floor(nextFloat(state) * n);
}

export function rollD6(state) {
  return randInt(state, 6) + 1;
}

export function shuffle(state, array) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(state, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function newSeed() {
  const buf = new Uint32Array(1);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(buf);
  else buf[0] = Math.floor(Math.random() * 4294967296);
  return buf[0] >>> 0;
}
