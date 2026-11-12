// Archivos de audio OPCIONALES. Mientras estén en null se usa el sonido generado por el juego (js/audio/synth.js),
// que no tiene derechos de autor. Para cambiar la música: poné tu archivo en www/assets/audio/ y escribí su ruta acá.
// Formatos que funcionan en el APK: mp3, ogg, m4a, wav.
export const AUDIO_FILES = {
  music: 'assets/audio/clash-of-steel-loop.ogg', // tema de fondo (se repite en bucle). null = música generada por el juego
  sfx: {
    // ej.: throw: 'assets/audio/dado.mp3'. Nombres: tap, select, deselect, zoom, play, flip, throw, duelWin, duelLose,
    // duelTie, roundIntro, roundWin, roundLose, gameWin, gameLose, error
  },
};
