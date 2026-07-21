// RF-A11Y-01: idioma de página (Español/Inglés) para todo el "chrome" de texto construido
// por la app (labels, botones, mensajes de error/resiliencia, los 5 subproyectos). Los datos
// que vienen de la API (nombres de equipos, estadios, ciudades — ya en inglés por naturaleza,
// ej. name_en) NUNCA pasan por aquí, se muestran tal cual llegan.
//
// Mismo patrón que utils/fontScale.js: preferencia en localStorage, aplicada al cargar antes
// de renderizar nada (sin parpadeo), con una función de traducción por clave en vez de
// literales sueltos por archivo.
export const LANGUAGE_STORAGE_KEY = 'a11y:language';

export const LANGUAGES = ['es', 'en'];

// RF-A11Y-01: <html lang="..."> debe reflejar "es-CR" para español (no solo "es").
const HTML_LANG_BY_LANGUAGE = {
  es: 'es-CR',
  en: 'en',
};

const DICTIONARY = {
  // Login (loginForm.js) — compartido por pantalla completa (RF-06) y modal de sesión expirada (RF-08)
  'login.title': { es: 'Iniciar sesión', en: 'Log in' },
  'login.email': { es: 'Correo', en: 'Email' },
  'login.emailPlaceholder': { es: 'tu@correo.com', en: 'you@email.com' },
  'login.password': { es: 'Contraseña', en: 'Password' },
  'login.submit': { es: 'Ingresar', en: 'Enter' },
  'login.submitting': { es: 'Ingresando...', en: 'Signing in...' },
  'login.subtitle': { es: 'Autentícate para consultar el itinerario del Mundial 2026.', en: 'Sign in to check out the 2026 World Cup itinerary.' },
  'login.sessionExpiredSubtitle': { es: 'Vuelve a ingresar tus credenciales para continuar.', en: 'Enter your credentials again to continue.' },
  'login.sessionExpiredAlert': { es: 'Tu sesión expiró', en: 'Your session expired' },
  'login.error.network': { es: 'No se pudo conectar con el servidor. Verifica tu conexión.', en: 'Could not connect to the server. Check your connection.' },
  'login.error.401': { es: 'Correo o contraseña incorrectos.', en: 'Incorrect email or password.' },
  'login.error.429': { es: 'Demasiados intentos. Espera un momento antes de volver a intentar.', en: 'Too many attempts. Wait a moment before trying again.' },
  'login.error.500': { es: 'El servidor no está disponible en este momento. Intenta de nuevo.', en: 'The server is unavailable right now. Please try again.' },
  'login.error.unexpected': { es: 'Ocurrió un error inesperado al iniciar sesión.', en: 'An unexpected error occurred while logging in.' },
  'login.validation.emailInvalid': { es: 'Ingresa un correo válido.', en: 'Enter a valid email address.' },
  'login.validation.passwordRequired': { es: 'La contraseña no puede estar vacía.', en: 'Password cannot be empty.' },

  // accountMenu.js
  'account.defaultName': { es: 'Usuario', en: 'User' },
  'account.activeSession': { es: 'Sesión activa', en: 'Active session' },
  'account.logout': { es: 'Cerrar sesión', en: 'Log out' },

  // accessibilityPanel.js
  'a11y.sectionTitle': { es: 'Accesibilidad', en: 'Accessibility' },
  'a11y.textSizeLabel': { es: 'Tamaño de texto', en: 'Text size' },
  'a11y.languageLabel': { es: 'Idioma', en: 'Language' },

  // projectMenu.js — nombres oficiales del catálogo (RF-07 sección 7 de requirements.md): no se
  // abrevian ni renombran para trazabilidad directa con el enunciado, pero sí se traducen.
  'project.rutaDelCampeon': { es: 'La Ruta del Campeón', en: "The Champion's Route" },
  'project.rastreadorDeGoleadas': { es: 'Rastreador de Goleadas', en: 'Blowout Tracker' },
  'project.elMuro': { es: 'El Muro', en: 'The Wall' },
  'project.analiticaDeEstadios': { es: 'Analítica de Estadios', en: 'Stadium Analytics' },
  'project.radarDeEmpates': { es: 'Radar de Empates', en: 'Draws Radar' },

  // main.js — vista en construcción + genérico
  'view.underConstruction': { es: 'Esta vista está en construcción. Pronto disponible.', en: 'This view is under construction. Coming soon.' },
  'view.genericProject': { es: 'Proyecto', en: 'Project' },
  'view.loadError': { es: 'No se pudieron cargar los datos. Verifica tu conexión e intenta de nuevo.', en: 'The data could not be loaded. Check your connection and try again.' },
  'view.retry': { es: 'Reintentar', en: 'Retry' },

  // resilienceBanners.js
  'banner.rateLimit': { es: 'Límite de tasa<br />reintentando en', en: 'Rate limit<br />retrying in' },
  'banner.serverError': { es: 'Error de servidor · reintentando conexión...', en: 'Server error · retrying connection...' },
  'banner.staleData': { es: 'Datos no actualizados ·', en: 'Outdated data ·' },

  // 2.1 La Ruta del Campeón
  'itinerary.title': { es: 'La Ruta del Campeón', en: "The Champion's Route" },
  'itinerary.description': { es: 'Itinerario completo de partidos, estadios y ciudades visitadas por el equipo seleccionado.', en: 'Full itinerary of matches, stadiums and cities visited by the selected team.' },
  'itinerary.citiesVisited': { es: 'Ciudades visitadas', en: 'Cities visited' },
  'itinerary.selectTeam': { es: 'Selecciona un equipo', en: 'Select a team' },
  'itinerary.chooseTeam': { es: 'Elige un equipo', en: 'Choose a team' },
  'itinerary.stadiumUnavailable': { es: 'Estadio no disponible', en: 'Stadium unavailable' },

  // 2.2 Rastreador de Goleadas
  'goals.title': { es: 'Rastreador de Goleadas', en: 'Blowout Tracker' },
  'goals.description': { es: 'Partidos con diferencia de gol de 3 o más, ordenados de mayor a menor goleada.', en: 'Matches with a goal difference of 3 or more, sorted from biggest to smallest blowout.' },
  'goals.found': { es: 'Goleadas encontradas', en: 'Blowouts found' },

  // 2.3 El Muro
  'wall.title': { es: 'El Muro', en: 'The Wall' },
  'wall.description': { es: 'Ranking de las mejores defensas del torneo según goles recibidos en la fase de grupos, con el próximo rival de cada una.', en: "Ranking of the tournament's best defenses by goals conceded in the group stage, with each team's next opponent." },
  'wall.bestDefenses': { es: 'Mejores defensas', en: 'Best defenses' },
  'wall.goalsAgainstAbbr': { es: 'GC', en: 'GA' },
  'wall.nextOpponentUnavailable': { es: 'Próximo rival no disponible', en: 'Next opponent unavailable' },
  'wall.eliminated': { es: 'Eliminado', en: 'Eliminated' },
  'wall.vs': { es: 'vs', en: 'vs' },

  // 2.4 Analítica de Estadios
  'stadiums.title': { es: 'Analítica de Estadios', en: 'Stadium Analytics' },
  'stadiums.description': { es: 'Comparativa de aforo y partidos albergados por estadio, con la asistencia potencial estimada.', en: 'Comparison of capacity and matches hosted per stadium, with estimated potential attendance.' },
  'stadiums.capacityVsGames': { es: 'Capacidad vs. partidos albergados', en: 'Capacity vs. matches hosted' },
  'stadiums.potentialAttendance': { es: 'Asistencia potencial', en: 'Potential attendance' },
  'stadiums.capacity': { es: 'Aforo', en: 'Capacity' },
  'stadiums.games': { es: 'Partidos', en: 'Matches' },
  'stadiums.waiting': { es: 'Esperando…', en: 'Waiting…' },
  'stadiums.waitingGamesData': { es: 'Esperando datos de partidos…', en: 'Waiting for match data…' },

  // 2.5 Radar de Empates
  'draws.title': { es: 'Radar de Empates', en: 'Draws Radar' },
  'draws.description': { es: 'Partidos empatados del torneo, agrupados por grupo.', en: 'Tied matches in the tournament, grouped by group.' },
  'draws.found': { es: 'Empates encontrados', en: 'Draws found' },
  'draws.group': { es: 'Grupo', en: 'Group' },
  'draws.count.one': { es: 'empate', en: 'draw' },
  'draws.count.other': { es: 'empates', en: 'draws' },

  // vs. compartido (goals/itinerary usan "vs" literal en template, se deja fijo por ser abreviatura universal)
};

export const getStoredLanguage = () => {
  const idiomaGuardado = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return LANGUAGES.includes(idiomaGuardado) ? idiomaGuardado : 'es';
};

// Suscriptores notificados cada vez que el idioma cambia, para que main.js pueda re-renderizar
// la navbar y la vista activa sin recargar la página (ver setLanguage).
const suscriptores = new Set();

export const onLanguageChange = (callback) => {
  suscriptores.add(callback);
  return () => suscriptores.delete(callback);
};

export const applyLanguage = (idioma) => {
  document.documentElement.setAttribute('lang', HTML_LANG_BY_LANGUAGE[idioma] ?? HTML_LANG_BY_LANGUAGE.es);
};

export const setLanguage = (idioma) => {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, idioma);
  applyLanguage(idioma);
  suscriptores.forEach((callback) => callback(idioma));
};

// Llamado desde main.js antes de renderizar cualquier vista (mismo momento que initFontScale),
// para que no haya parpadeo de idioma al recargar con una preferencia ya guardada.
export const initI18n = () => {
  applyLanguage(getStoredLanguage());
};

// Traduce una clave del diccionario al idioma activo. Si la clave no existe, se devuelve la
// clave misma (nunca undefined) para que un olvido de traducción sea visible en vez de romper la UI.
export const t = (key) => {
  const entrada = DICTIONARY[key];
  if (!entrada) {
    console.warn(`[i18n] Falta traducción para la clave "${key}"`);
    return key;
  }
  const idioma = getStoredLanguage();
  return entrada[idioma] ?? entrada.es;
};
