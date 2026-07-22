import { authFetch, ApiError, fetchSimulatedError, fetchSimulatedSuccess } from './httpClient.js';
import { getToken, setCachedData, getCachedData } from '../state/appState.js';
import { fetchWithBackoff } from '../utils/backoff.js';

// Los 3 endpoints /get/* envuelven el array en un objeto bajo una key con
// el nombre del recurso (ej. { teams: [...] }), no lo devuelven en la raíz.

// Este módulo no conoce la UI: los callbacks de banners (RF-09/RF-10) los
// inyecta quien orquesta la llamada (main.js), con esta forma:
// { showRateLimitBanner, hideRateLimitBanner, showServerErrorBanner,
//   hideServerErrorBanner, showCacheBanner, hideCacheBanner }

// Puente entre fetchWithBackoff (sin DOM) y los banners de resiliencia
// (RF-09): 429 dispara countdown, 5xx la barra de progreso. `source` viaja
// en cada show/hide para que teams/games/stadiums no se pisen el chip entre
// sí (ver resilienceBanners.js).
const conBackoffVisible = (source, peticion, banners) => {
  // `onTick` se dispara cada segundo sin importar si el ciclo es 429 o 500;
  // `ultimoStatus` evita que un ciclo de 500 dispare el countdown de 429.
  let ultimoStatus = null;

  return fetchWithBackoff(peticion, {
    onRetry: ({ status, delayMs }) => {
      ultimoStatus = status;
      if (status === 429) {
        banners.showRateLimitBanner(source, Math.ceil(delayMs / 1000));
      } else {
        banners.showServerErrorBanner(source, delayMs);
      }
    },
    onTick: (segundosRestantes) => {
      // El chip 500 es barra de progreso animada por CSS, sin countdown.
      if (ultimoStatus === 429 && segundosRestantes > 0) {
        banners.showRateLimitBanner(source, segundosRestantes);
      }
    },
  });
};

// Capa común a teams/games/stadiums (RF-07 a RF-10): reintenta con backoff
// ante 429/500 (NetworkError sin respuesta no reintenta, va directo a
// caché); si falla y hay copia cacheada la devuelve con badge "Datos no
// actualizados" (RF-10); si no hay caché, o es 401, propaga el error.
const fetchDatasetResiliente = async (cacheKey, path, responseKey, banners) => {
  try {
    const respuesta = await conBackoffVisible(cacheKey, () => authFetch(path, getToken()), banners);
    banners.hideRateLimitBanner(cacheKey);
    banners.hideServerErrorBanner(cacheKey);
    banners.hideCacheBanner(cacheKey);
    const dataset = respuesta[responseKey];
    setCachedData(cacheKey, dataset);
    console.debug('[resiliencia] fetchDatasetResiliente — éxito', { cacheKey });
    return dataset;
  } catch (error) {
    banners.hideRateLimitBanner(cacheKey);
    banners.hideServerErrorBanner(cacheKey);

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
      banners.showCacheBanner(cacheKey, cache.timestamp);
      return cache.data;
    }

    console.debug('[resiliencia] fetchDatasetResiliente — sin caché disponible, se propaga el error', { cacheKey });
    throw error;
  }
};

// getTeams: GET /get/teams — array de 48 equipos.
// Campos usados en la app: id, name_en (nombre completo), flag.
// `banners`: callbacks de ui/resilienceBanners.js inyectados por main.js.
export const getTeams = async (banners) => fetchDatasetResiliente('teams', '/get/teams', 'teams', banners);

// getGames: GET /get/games — array de 104 partidos.
// Campos usados en la app: home_team_id, away_team_id, group, local_date,
// stadium_id, home_team_label/away_team_label (respaldo si el equipo aún no
// está definido, valor "0" en home_team_id/away_team_id).
export const getGames = async (banners) => fetchDatasetResiliente('games', '/get/games', 'games', banners);

// getStadiums: GET /get/stadiums — array de 16 estadios.
// Campos usados en la app: id, name_en (nombre completo), city_en, country_en,
// capacity (viene como número, no string). Ver main.js para el aislamiento de
// este fallo respecto a teams/games (RF-11): si stadiums falla sin caché, se
// deja que el itinerario se renderice igual con stadium = null por partido.
export const getStadiums = async (banners) => fetchDatasetResiliente('stadiums', '/get/stadiums', 'stadiums', banners);

// SOLO DESARROLLO. Base compartida por simulateServerError (500): usa fetch() real a /dev-mock/<status>
// (no un ApiError sintético) para que Network muestre status/headers/body
// reales y el backoff/countdown sea 100% el código de producción.
// `failCount` (default Infinity) controla cuántos intentos fallan antes de
// resolver con /dev-mock/200 ("el servidor se recupera a mitad del backoff").
// `source` usa el prefijo `dev-sim:` para no compartir banner con un backoff
// real en curso sobre el mismo dataset (ej. getTeams() al cargar la página).
const simulateApiError = async (status, datasetCacheKey, banners, { failCount = Infinity } = {}) => {
  if (!import.meta.env.DEV) return;

  const bannerSource = `dev-sim:${status}:${datasetCacheKey}`;

  let intentosHechos = 0;
  const peticionFalsa = async () => {
    intentosHechos += 1;
    if (intentosHechos <= failCount) {
      return await fetchSimulatedError(status);
    }
    // No hay dataset nuevo que aplicar; solo demuestra que el backoff puede terminar en éxito.
    return await fetchSimulatedSuccess();
  };

  try {
    await conBackoffVisible(bannerSource, peticionFalsa, banners);
    banners.hideRateLimitBanner(bannerSource);
    banners.hideServerErrorBanner(bannerSource);
    console.debug(`[resiliencia][DEV] simulación de ${status} se recuperó`, {
      bannerSource,
      fallosAntesDeRecuperar: intentosHechos - 1,
    });
  } catch (error) {
    banners.hideRateLimitBanner(bannerSource);
    banners.hideServerErrorBanner(bannerSource);
    console.debug(`[resiliencia][DEV] simulación de ${status} agotó reintentos`, {
      bannerSource,
      nombre: error.name,
      status: error.status,
    });

    const cache = getCachedData(datasetCacheKey);
    if (cache) {
      banners.showCacheBanner(bannerSource, cache.timestamp);
    }
  }
};

// SOLO DESARROLLO. La API de prueba no expone un endpoint de fallo controlado
// para forzar un 500 real y repetible.
// Para quitarlo: borrar esta función, el import de mountDevServerErrorSimulator y su línea en main.js.
export const simulateServerError = (cacheKey = 'teams', banners) => simulateApiError(500, cacheKey, banners);

// SOLO DESARROLLO. Reto RF-RE-R (requirements.md 12): la matriz de Radar de Empates se
// pinta grupo por grupo (ver renderDrawsMatrixShell/appendDrawsGroupSection en drawsMatrix.js);
// esta función simula que, al llegar el turno del grupo pendiente, esa "petición" puntual
// devuelve 429 `failCount` veces (con countdown vía conBackoffVisible) y luego se recupera —
// con `source` namespaced por grupo
// (`draws-group:<letra>`) para que el backoff de un grupo nunca se mezcle con el de otro ni
// con el de teams/games. Los grupos ya pintados antes de este punto no se tocan: main.js solo
// llama a esto ANTES de invocar appendDrawsGroupSection para el grupo pendiente.
// Para quitarlo: borrar esta función, el import de mountDevDrawsGroupFailureSimulator y sus líneas en main.js.
export const simulateDrawsGroupRateLimit = async (groupLetter, banners, { failCount = 1 } = {}) => {
  if (!import.meta.env.DEV) return;

  const source = `draws-group:${groupLetter}`;
  let intentosHechos = 0;
  const peticionFalsa = async () => {
    intentosHechos += 1;
    if (intentosHechos <= failCount) {
      return await fetchSimulatedError(429);
    }
    return await fetchSimulatedSuccess();
  };

  try {
    await conBackoffVisible(source, peticionFalsa, banners);
    console.debug('[resiliencia][DEV] simulación RF-RE-R — grupo pendiente se recuperó', { groupLetter, intentosHechos });
  } finally {
    banners.hideRateLimitBanner(source);
    banners.hideServerErrorBanner(source);
  }
};

// SOLO DESARROLLO. Fetch real a /dev-mock/401 para que clasificarRespuesta
// construya el ApiError(401) real (visible en Network) en vez de simularlo a mano.
// Para quitarlo: borrar esta función, el import de mountDevSessionSimulator y su línea en main.js.
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
