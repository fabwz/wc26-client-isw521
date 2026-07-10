// token/user viven en memoria y se espejan en localStorage para sobrevivir a un refresh.
const STORAGE_KEY_TOKEN = 'auth:token';
const STORAGE_KEY_USER = 'auth:user';

let authToken = localStorage.getItem(STORAGE_KEY_TOKEN);
let authUser = JSON.parse(localStorage.getItem(STORAGE_KEY_USER) ?? 'null');

export const setAuth = (token, user) => {
  authToken = token;
  authUser = user;
  localStorage.setItem(STORAGE_KEY_TOKEN, token);
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
};

export const clearAuth = () => {
  authToken = null;
  authUser = null;
  localStorage.removeItem(STORAGE_KEY_TOKEN);
  localStorage.removeItem(STORAGE_KEY_USER);
};

export const getToken = () => authToken;
export const getUser = () => authUser;
export const isAuthenticated = () => Boolean(authToken);

const cacheStorageKey = (endpointName) => `cache:${endpointName}`;

export const setCachedData = (endpointName, data) => {
  const entrada = { data, timestamp: Date.now() };
  localStorage.setItem(cacheStorageKey(endpointName), JSON.stringify(entrada));
};

export const getCachedData = (endpointName) => {
  const crudo = localStorage.getItem(cacheStorageKey(endpointName));
  if (!crudo) return null;
  return JSON.parse(crudo);
};
