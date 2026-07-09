import { isAuthenticated, clearAuth, getUser } from './state/appState.js';
import { ApiError } from './api/httpClient.js';
import { renderLoginScreen } from './ui/loginForm.js';
import { renderNavbar } from './ui/navbar.js';
import { renderTeamSelector } from './ui/teamSelector.js';
import { renderItineraryCards } from './ui/itineraryCards.js';
import { showSessionExpiredModal } from './ui/sessionExpiredModal.js';
import { mountDevSessionSimulator } from './ui/devSessionSimulator.js';
import { mountDevRateLimitSimulator } from './ui/devRateLimitSimulator.js';
import { mountDevServerErrorSimulator } from './ui/devServerErrorSimulator.js';
import {
  getTeams,
  getGames,
  getStadiums,
  simulateRateLimit,
  simulateRateLimitRecovery,
  simulateServerError,
  simulateSessionExpired,
} from './api/worldCupApi.js';
import { buildItinerary } from './domain/itineraryService.js';

const app = document.querySelector('#app');

// cerrarSesion: handler compartido por el menú de cuenta — limpia auth y
// vuelve a la pantalla de login, sin recargar la página (CLAUDE.md 3.2).
const cerrarSesion = () => {
  clearAuth();
  renderLoginScreen(app, { onSuccess: iniciarApp });
};

// manejarSesionExpirada: RF-08 — limpia el token y muestra el modal de
// reautenticación (mismo formulario de login, otro contenedor). Al
// reautenticar con éxito se vuelve a montar la vista, sin recargar la página.
const manejarSesionExpirada = () => {
  clearAuth();
  showSessionExpiredModal({ onReauthenticated: iniciarApp });
};

// Botón/atajo visible solo en `npm run dev` para forzar el modal de sesión
// expirada (RF-08) sin depender del servidor — ver devSessionSimulator.js.
// Primero hace un fetch() real a httpstat.us/401 (simulateSessionExpired,
// worldCupApi.js) y deja que la clasificación real construya el ApiError(401)
// — visible en Network — y solo entonces dispara manejarSesionExpirada, la
// misma función que usa la app ante un 401 real.
mountDevSessionSimulator(async () => {
  await simulateSessionExpired();
  manejarSesionExpirada();
});

// Botón/atajo visible solo en `npm run dev` para forzar un 429 y ver el
// countdown de backoff (RF-09) sin depender de ganarle a la caché HTTP de
// 30s del servidor real — ver devRateLimitSimulator.js / simulateRateLimit.
mountDevRateLimitSimulator(
  () => simulateRateLimit('teams'),
  () => simulateRateLimitRecovery('teams')
);

// Botón/atajo visible solo en `npm run dev` para forzar un 500 y ver el
// banner "Error de servidor · reintentando conexión..." con barra de
// progreso (RF-09) — ver devServerErrorSimulator.js / simulateServerError.
mountDevServerErrorSimulator(() => simulateServerError('teams'));

// iniciarApp: monta la navbar y la vista Itinerarios (selector de equipo +
// tarjetas). teams/games se piden juntos porque el selector no puede
// mostrarse sin ellos; stadiums se pide por separado y su fallo se aísla
// (RF-11): si stadiums falla sin caché disponible, el itinerario igual se
// renderiza con stadium = null en cada tarjeta ("Estadio no disponible"), en
// vez de tumbar toda la vista.
const iniciarApp = async () => {
  app.innerHTML = `
    <div id="navbar-slot"></div>
    <main class="min-h-screen px-4 py-24 max-w-5xl mx-auto flex flex-col gap-8">
      <div id="team-selector-slot" class="max-w-xs"></div>
      <div id="itinerary-slot"></div>
    </main>
  `;

  renderNavbar(app.querySelector('#navbar-slot'), getUser(), { onLogout: cerrarSesion });

  const selectorSlot = app.querySelector('#team-selector-slot');
  const itinerarySlot = app.querySelector('#itinerary-slot');

  let teams;
  let games;

  try {
    // No importa el orden en que resuelvan estas dos (RNF-03): se juntan
    // antes de poblar el selector.
    [teams, games] = await Promise.all([getTeams(), getGames()]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      manejarSesionExpirada();
      return;
    }
    console.error('Fallo al cargar teams/games (sin caché disponible):', error);
    clearAuth();
    renderLoginScreen(app, { onSuccess: iniciarApp });
    return;
  }

  // authFetch no siempre lanza (ej. respuesta 200 con un cuerpo que no es el
  // array esperado, típico de un token corrupto que la API no rechaza con
  // 401 de forma explícita) — validamos la forma de los datos como frontera
  // con la API externa antes de asumir que la sesión es válida.
  if (!Array.isArray(teams) || !Array.isArray(games)) {
    console.error('Respuesta inesperada de la API (se esperaba un array):', { teams, games });
    clearAuth();
    renderLoginScreen(app, { onSuccess: iniciarApp });
    return;
  }

  // stadiums se pide aparte y de forma aislada (RF-11): si falla y no hay
  // caché, seguimos con un array vacío en vez de abortar todo el render — el
  // cruce en itineraryService ya contempla stadium_id sin match (stadium: null).
  let stadiums = [];
  try {
    stadiums = await getStadiums();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      manejarSesionExpirada();
      return;
    }
    console.error('Fallo al cargar stadiums (sin caché disponible):', error);
  }
  if (!Array.isArray(stadiums)) stadiums = [];

  renderTeamSelector(selectorSlot, teams, {
    onTeamSelected: (selectedTeamId) => {
      const equipoSeleccionado = teams.find((team) => team.id === selectedTeamId);
      const itinerario = buildItinerary(selectedTeamId, teams, games, stadiums);
      renderItineraryCards(itinerarySlot, equipoSeleccionado.name_en, equipoSeleccionado.flag, itinerario);
    },
  });
};

if (isAuthenticated()) {
  iniciarApp();
} else {
  renderLoginScreen(app, { onSuccess: iniciarApp });
}
