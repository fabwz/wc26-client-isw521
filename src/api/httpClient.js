// En dev, /wc26-api pasa por el proxy de Vite para evitar CORS (ver vite.config.js).
const API_BASE_URL = import.meta.env.DEV ? '/wc26-api' : 'https://worldcup26.ir';

// fetch no tiene timeout propio: sin esto, una conexión caída puede colgar la app.
const REQUEST_TIMEOUT_MS = 8000;

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Sin `status`: señala a backoff.js que no hubo respuesta que clasificar/reintentar.
export class NetworkError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

const fetchConTimeout = async (url, options) => {
  const controlador = new AbortController();
  const timeoutId = setTimeout(() => controlador.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controlador.signal });
  } catch (error) {
    // TEMPORAL: confirma en Console si el error real es TypeError (sin conexión/DNS/CORS)
    // o AbortError (timeout) — retirar una vez validado en vivo.
    console.debug('[resiliencia] NetworkError — sin respuesta HTTP', { url, causaOriginal: error.name });
    throw new NetworkError('No se pudo conectar con el servidor', error);
  } finally {
    clearTimeout(timeoutId);
  }
};

const clasificarRespuesta = async (respuesta, mensajes) => {
  if (respuesta.status !== 200) {
    // TEMPORAL: confirma en Console que el status viene de una respuesta HTTP
    // real, no de una NetworkError disfrazada — retirar una vez validado en vivo.
    console.debug('[resiliencia] ApiError — respuesta HTTP real', { url: respuesta.url, status: respuesta.status });
  }
  if (respuesta.status === 401) {
    throw new ApiError(401, mensajes[401]);
  }
  if (respuesta.status === 429) {
    throw new ApiError(429, 'Límite de peticiones excedido');
  }
  if (respuesta.status >= 500) {
    throw new ApiError(respuesta.status, 'Error del servidor');
  }
  if (!respuesta.ok) {
    throw new ApiError(respuesta.status, mensajes.default);
  }
  return await respuesta.json();
};

export const authFetch = async (path, token) => {
  const respuesta = await fetchConTimeout(`${API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return clasificarRespuesta(respuesta, {
    401: 'Sesión expirada o token inválido',
    default: 'Error al consultar la API',
  });
};

// Para los endpoints /auth/*, que no llevan Authorization header.
export const publicFetch = async (path, body) => {
  const respuesta = await fetchConTimeout(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return clasificarRespuesta(respuesta, {
    401: 'Credenciales inválidas',
    default: 'Error de autenticación',
  });
};

// SOLO DESARROLLO. httpstat.us (servicio externo) resultó poco confiable en
// pruebas (ERR_EMPTY_RESPONSE intermitente); /dev-mock/* es un middleware
// local del dev server (vite.config.js) que no sale a internet.
const DEV_MOCK_BASE_URL = '/dev-mock';

export const fetchSimulatedError = async (status) => {
  const respuesta = await fetchConTimeout(`${DEV_MOCK_BASE_URL}/${status}`, {
    headers: { Accept: 'application/json' },
  });
  return clasificarRespuesta(respuesta, {
    401: `Simulado (dev): 401 real desde ${DEV_MOCK_BASE_URL}`,
    default: `Simulado (dev): ${status} real desde ${DEV_MOCK_BASE_URL}`,
  });
};

// No pasa por clasificarRespuesta: esta espera la forma de un dataset real, aquí solo importa el 2xx.
export const fetchSimulatedSuccess = async () => {
  const respuesta = await fetchConTimeout(`${DEV_MOCK_BASE_URL}/200`, {
    headers: { Accept: 'application/json' },
  });
  if (!respuesta.ok) {
    throw new ApiError(respuesta.status, 'Simulado (dev): fallo inesperado en la petición de recuperación');
  }
  return { simulated: true };
};
