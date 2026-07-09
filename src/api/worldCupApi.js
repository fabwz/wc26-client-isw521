import { authFetch, ApiError, fetchSimulatedError, fetchSimulatedSuccess } from './httpClient.js';
import { getToken, setCachedData, getCachedData } from '../state/appState.js';
import { fetchWithBackoff } from '../utils/backoff.js';
import {
  showRateLimitBanner,
  hideRateLimitBanner,
  showServerErrorBanner,
  hideServerErrorBanner,
  showCacheBanner,
  hideCacheBanner,
} from '../ui/resilienceBanners.js';

// Los 3 endpoints /get/* no devuelven el array directo en la raíz de la
// respuesta: lo envuelven en un objeto bajo una key con el nombre del
// recurso (comprobado contra la API real, ej. { teams: [...] }). Los
// ejemplos de context/api-reference.md muestran solo la forma de un item
// individual, no la envoltura del array completo.

// onRetry: puente entre fetchWithBackoff (que no sabe nada de DOM) y los
// banners de resiliencia (RF-09) — 429 dispara el countdown, 5xx la barra de
// progreso. `source` (el cacheKey del dataset) viaja en cada show/hide para
// que 3 peticiones concurrentes (teams/games/stadiums) no se pisen el chip
// entre sí (ver comentario en resilienceBanners.js sobre la condición de
// carrera que esto corrige).
const conBackoffVisible = (source, peticion) => {
  // BUG corregido: `onTick` (backoff.js) se dispara una vez por segundo
  // durante CUALQUIER espera, sin importar si el ciclo actual es 429 o 500 —
  // no recibe el status. Antes, `onTick` llamaba a showRateLimitBanner sin
  // condición alguna, así que un ciclo de 500 también disparaba el chip 429
  // en el primer tick (mismo `source`, mismo delayMs/segundosRestantes —
  // confirmado en Console). `ultimoStatus` guarda qué status originó el
  // ciclo de espera en curso para que `onTick` solo actualice el chip que
  // corresponde.
  let ultimoStatus = null;

  return fetchWithBackoff(peticion, {
    onRetry: ({ status, delayMs }) => {
      ultimoStatus = status;
      if (status === 429) {
        showRateLimitBanner(source, Math.ceil(delayMs / 1000));
      } else {
        showServerErrorBanner(source, delayMs);
      }
    },
    onTick: (segundosRestantes) => {
      // El chip 500 no muestra segundos (barra de progreso animada por CSS,
      // no countdown) — solo actualizamos el countdown de 429 tick a tick, y
      // solo si el ciclo de espera actual es realmente un 429.
      if (ultimoStatus === 429 && segundosRestantes > 0) {
        showRateLimitBanner(source, segundosRestantes);
      }
    },
  });
};

// fetchDatasetResiliente: capa común a teams/games/stadiums (RF-07 a RF-10).
// 1) intenta la petición en vivo. Ante ApiError 429/500 (respuesta HTTP real),
//    fetchWithBackoff reintenta con countdown/barra visibles. Ante NetworkError
//    (sin respuesta: sin conexión, DNS, timeout) NO reintenta — no hay nada
//    que reintentar con backoff si el servidor nunca contestó — y cae directo
//    al paso 3.
// 2) si tiene éxito, cachea la respuesta, limpia los banners de ESTE source y
//    retira el badge de caché si este dataset lo tenía activo.
// 3) si falla (agotado el backoff, o NetworkError inmediato) y hay copia
//    cacheada, la devuelve mostrando el badge "Datos no actualizados" (RF-10).
// 4) si no hay caché, o el error es 401 (sesión expirada, RF-08), se
//    propaga tal cual para que la capa de arriba decida qué hacer.
const fetchDatasetResiliente = async (cacheKey, path, responseKey) => {
  try {
    const respuesta = await conBackoffVisible(cacheKey, () => authFetch(path, getToken()));
    hideRateLimitBanner(cacheKey);
    hideServerErrorBanner(cacheKey);
    hideCacheBanner(cacheKey);
    const dataset = respuesta[responseKey];
    setCachedData(cacheKey, dataset);
    console.debug('[resiliencia] fetchDatasetResiliente — éxito', { cacheKey });
    return dataset;
  } catch (error) {
    hideRateLimitBanner(cacheKey);
    hideServerErrorBanner(cacheKey);

    // TEMPORAL: confirma en Console si, al fallar, el error es un NetworkError
    // (sin status → va directo a caché) o un ApiError con un status HTTP real
    // (401/429/500/otro) — retirar una vez validado en vivo.
    console.debug('[resiliencia] fetchDatasetResiliente — error final', {
      cacheKey,
      nombre: error.name,
      status: error.status,
    });

    if (error instanceof ApiError && error.status === 401) {
      throw error;
    }

    const cache = getCachedData(cacheKey);
    if (cache) {
      console.debug('[resiliencia] fetchDatasetResiliente — usando caché', { cacheKey, timestamp: cache.timestamp });
      showCacheBanner(cacheKey, cache.timestamp);
      return cache.data;
    }

    console.debug('[resiliencia] fetchDatasetResiliente — sin caché disponible, se propaga el error', { cacheKey });
    throw error;
  }
};

// getTeams: GET /get/teams — array de 48 equipos.
// Campos usados en la app: id, name_en (nombre completo), flag.
export const getTeams = async () => fetchDatasetResiliente('teams', '/get/teams', 'teams');

// getGames: GET /get/games — array de 104 partidos.
// Campos usados en la app: home_team_id, away_team_id, group, local_date,
// stadium_id, home_team_label/away_team_label (respaldo si el equipo aún no
// está definido, valor "0" en home_team_id/away_team_id).
export const getGames = async () => fetchDatasetResiliente('games', '/get/games', 'games');

// getStadiums: GET /get/stadiums — array de 16 estadios.
// Campos usados en la app: id, name_en (nombre completo), city_en, country_en,
// capacity (viene como número, no string). Ver main.js para el aislamiento de
// este fallo respecto a teams/games (RF-11): si stadiums falla sin caché, se
// deja que el itinerario se renderice igual con stadium = null por partido.
export const getStadiums = async () => fetchDatasetResiliente('stadiums', '/get/stadiums', 'stadiums');

// simulateApiError: SOLO DESARROLLO. Base compartida por simulateRateLimit /
// simulateRateLimitRecovery (429) y simulateServerError (500) — pasa por el
// mismo conBackoffVisible/fetchWithBackoff/resilienceBanners que un error
// real (fetchDatasetResiliente arriba), solo que `peticionFalsa` reemplaza a
// `authFetch` como la función que "falla". La diferencia clave con la versión
// anterior: `peticionFalsa` YA NO lanza `new ApiError(status, mensaje)`
// sintético en memoria — hace un fetch() REAL a httpstat.us/<status>
// (fetchSimulatedError, httpClient.js) y deja que el mismo
// `clasificarRespuesta` de producción construya el ApiError a partir de esa
// respuesta HTTP real. Eso significa que la pestaña Network SÍ muestra una
// petición real, con status/headers/body reales, en cada intento — requisito
// explícito de la rúbica (RNF-04) que un `throw` en memoria no cumplía. El
// countdown/barra y los reintentos con backoff creciente (1s→2s→4s→8s) son
// 100% el código de producción — lo único "de dev" es que el servidor detrás
// del fetch es httpstat.us en vez de worldcup26.ir.
//
// `failCount` controla cuántos intentos fallan antes de resolver:
// - Infinity (default): nunca se recupera, agota los 4 reintentos y cae a
//   caché — es el caso "el servidor sigue caído".
// - un número finito (ej. 2): falla esa cantidad de veces y el siguiente
//   intento hace un fetch real a httpstat.us/200 (fetchSimulatedSuccess) —
//   es el caso "el servidor se recupera a mitad del backoff", con los
//   banners desapareciendo limpiamente sin pasar por caché.
//
// `datasetCacheKey` ('teams'/'games'/'stadiums') es SOLO de dónde se lee el
// dato cacheado real para el badge de caché (así la demo de "cae a caché"
// muestra datos reales, no un placeholder). El `source` que se le pasa a
// conBackoffVisible/los banners de 429-500 es uno propio, con prefijo
// `dev-sim:`, DISTINTO de `datasetCacheKey` — si no, un ciclo de backoff real
// en curso sobre ese mismo dataset (ej. getTeams() corriendo en iniciarApp()
// al cargar la página) podía mostrar SU banner (real) al mismo tiempo que el
// simulado, pareciendo una clasificación cruzada cuando en realidad eran dos
// backoffs independientes compitiendo por el mismo `source` (bug reportado:
// clic en "Simular 500" mostraba también 429 porque la API real estaba
// genuinamente rate-limited sobre 'teams' en ese instante).
const simulateApiError = async (status, datasetCacheKey, { failCount = Infinity } = {}) => {
  if (!import.meta.env.DEV) return;

  const bannerSource = `dev-sim:${status}:${datasetCacheKey}`;

  let intentosHechos = 0;
  const peticionFalsa = async () => {
    intentosHechos += 1;
    if (intentosHechos <= failCount) {
      // Fetch real a httpstat.us/<status> — aparece en Network con status,
      // headers y body reales. clasificarRespuesta (httpClient.js) construye
      // el ApiError real a partir de esa Response, no uno sintético.
      return await fetchSimulatedError(status);
    }
    // Recuperación simulada: fetch real a httpstat.us/200 (también visible
    // en Network) — no hay dataset nuevo real que aplicar, la app sigue
    // mostrando lo que ya tenía cargado; esto solo demuestra que el backoff
    // puede terminar en éxito.
    return await fetchSimulatedSuccess();
  };

  try {
    await conBackoffVisible(bannerSource, peticionFalsa);
    hideRateLimitBanner(bannerSource);
    hideServerErrorBanner(bannerSource);
    console.debug(`[resiliencia][DEV] simulación de ${status} se recuperó`, {
      bannerSource,
      fallosAntesDeRecuperar: intentosHechos - 1,
    });
  } catch (error) {
    hideRateLimitBanner(bannerSource);
    hideServerErrorBanner(bannerSource);
    console.debug(`[resiliencia][DEV] simulación de ${status} agotó reintentos`, {
      bannerSource,
      nombre: error.name,
      status: error.status,
    });

    const cache = getCachedData(datasetCacheKey);
    if (cache) {
      showCacheBanner(bannerSource, cache.timestamp);
    }
  }
};

// simulateRateLimit: SOLO DESARROLLO. La API real de prueba tiene una caché
// HTTP de 30s que sirve la URL exacta sin parámetros (la que usa la app) sin
// pasar por el rate limiter, aunque ya se haya agotado el límite real con
// otras variantes de URL — confirmado con los headers RateLimit-* en pruebas
// manuales. Eso hace poco práctico/repetible disparar un 429 real contra el
// propio servidor para la demo. Esta variante SIEMPRE agota los reintentos y
// cae a caché (failCount por defecto = Infinity) — ver simulateRateLimitRecovery
// para el caso donde el backoff termina en éxito.
//
// Para quitarlo antes de la entrega final: borra esta función, el import de
// mountDevRateLimitSimulator y la línea que lo monta en main.js.
export const simulateRateLimit = (cacheKey = 'teams') => simulateApiError(429, cacheKey);

// simulateRateLimitRecovery: SOLO DESARROLLO. Misma mecánica que
// simulateRateLimit, pero falla solo los primeros 2 intentos (fetch real a
// httpstat.us/429) y el 3ro hace un fetch real a httpstat.us/200 — para
// demostrar el caso donde el backoff SÍ se recupera (countdown 1s → 2s,
// banner desaparece, la app sigue con datos en vivo) en vez de terminar
// siempre cayendo a caché.
export const simulateRateLimitRecovery = (cacheKey = 'teams') => simulateApiError(429, cacheKey, { failCount: 2 });

// simulateServerError: SOLO DESARROLLO. No hay forma confiable de forzar un
// 500 real y repetible contra la API de prueba para la demo (no expone un
// endpoint de fallo controlado) — mismo problema práctico que motivó
// simulateRateLimit, pero para el banner "Error de servidor · reintentando
// conexión..." con barra de progreso (ver resilienceBanners.js).
//
// Para quitarlo antes de la entrega final: borra esta función, el import de
// mountDevServerErrorSimulator y la línea que lo monta en main.js.
export const simulateServerError = (cacheKey = 'teams') => simulateApiError(500, cacheKey);

// simulateSessionExpired: SOLO DESARROLLO. Igual que los anteriores, hace un
// fetch() REAL a httpstat.us/401 (fetchSimulatedError) y deja que el mismo
// clasificarRespuesta de producción construya el ApiError(401) real a partir
// de esa respuesta — visible en Network con status/headers/body reales, en
// vez de que main.js llame a manejarSesionExpirada() directamente sin
// petición de por medio. Devuelve una vez que la clasificación ya ocurrió;
// quien llama (main.js) dispara manejarSesionExpirada() después, igual que
// lo haría ante un 401 real capturado en cualquier fetchDatasetResiliente.
//
// Para quitarlo antes de la entrega final: borra esta función, el import de
// mountDevSessionSimulator y la línea que lo monta en main.js.
export const simulateSessionExpired = async () => {
  if (!import.meta.env.DEV) return;
  try {
    await fetchSimulatedError(401);
  } catch (error) {
    console.debug('[resiliencia][DEV] simulación de 401 clasificada desde respuesta real', {
      nombre: error.name,
      status: error.status,
    });
  }
};
