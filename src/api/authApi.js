import { publicFetch } from './httpClient.js';

// login: POST /auth/authenticate — no lleva Authorization header (es el
// endpoint que genera el token). Devuelve { user, token } o lanza ApiError
// (401 credenciales inválidas, 429 rate limit, 500 servidor).
export const login = async (email, password, { signal } = {}) => {
  return await publicFetch('/auth/authenticate', { email, password }, { signal });
};
