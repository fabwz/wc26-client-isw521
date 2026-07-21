import { login as loginRequest } from '../api/authApi.js';
import { setAuth, clearAuth, getToken, getUser, isAuthenticated } from '../state/appState.js';

// login: autentica contra POST /auth/authenticate (vía authApi) y persiste
// token/user en appState. Lanza el mismo ApiError que authApi.login
// (401 credenciales inválidas, 429 rate limit, 500 servidor) — el llamador
// (ui/loginForm.js) decide el mensaje a mostrar.
export const login = async (email, password, { signal } = {}) => {
  const { user, token } = await loginRequest(email, password, { signal });
  setAuth(token, user);
  return user;
};

// logout: limpia el token/user de memoria y localStorage.
export const logout = () => {
  clearAuth();
};

export { getToken, getUser, isAuthenticated };
