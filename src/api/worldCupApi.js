import { authFetch } from './httpClient.js';
import { getToken } from '../state/appState.js';

// Los 3 endpoints /get/* no devuelven el array directo en la raíz de la
// respuesta: lo envuelven en un objeto bajo una key con el nombre del
// recurso (comprobado contra la API real, ej. { teams: [...] }). Los
// ejemplos de context/api-reference.md muestran solo la forma de un item
// individual, no la envoltura del array completo.

// getTeams: GET /get/teams — array de 48 equipos.
// Campos usados en la app: id, name_en (nombre completo), flag.
export const getTeams = async () => {
  const { teams } = await authFetch('/get/teams', getToken());
  return teams;
};

// getGames: GET /get/games — array de 104 partidos.
// Campos usados en la app: home_team_id, away_team_id, group, local_date,
// stadium_id, home_team_label/away_team_label (respaldo si el equipo aún no
// está definido, valor "0" en home_team_id/away_team_id).
export const getGames = async () => {
  const { games } = await authFetch('/get/games', getToken());
  return games;
};

// getStadiums: GET /get/stadiums — array de 16 estadios.
// Campos usados en la app: id, name_en (nombre completo), city_en, country_en,
// capacity (viene como número, no string).
export const getStadiums = async () => {
  const { stadiums } = await authFetch('/get/stadiums', getToken());
  return stadiums;
};
