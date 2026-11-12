// Idiomas. Las frases en español son la clave: t('Texto {dato}', { dato }) devuelve el texto en el idioma elegido.
// Si falta una traducción se muestra el español. Para sumar un idioma: copiá js/i18n/en.js, traducí y registralo en DICTS.
import { EN } from './i18n/en.js';

export const LANGS = [{ id: 'es', label: 'Español' }, { id: 'en', label: 'English' }];
const DICTS = { en: EN };
let lang = 'es';

export const getLang = () => lang;
export function setLang(l) { lang = DICTS[l] ? l : 'es'; }

const fill = (s, params) => (params ? s.replace(/\{(\w+)\}/g, (m, k) => (k in params ? params[k] : m)) : s);

export function t(key, params) {
  const dict = DICTS[lang];
  const s = dict && dict[key] !== undefined ? dict[key] : key;
  return fill(s, params);
}

// Para textos de datos (cartas, escenarios, clases): sin parámetros, devuelve el original si no hay traducción.
export const td = (key) => (key == null ? key : t(key));
