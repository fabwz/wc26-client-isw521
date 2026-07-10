import { isAuthenticated, clearAuth, getUser } from './state/appState.js';
import { ApiError } from './api/httpClient.js';
import { renderLoginScreen } from './ui/loginForm.js';
import { renderNavbar } from './ui/navbar.js';
import { renderTeamSelector } from './ui/teamSelector.js';
import { renderItineraryCards, markStadiumsUnavailableForCards } from './ui/itineraryCards.js';
import { showSessionExpiredModal } from './ui/sessionExpiredModal.js';
import { mountDevToolsPanel } from './ui/devToolsPanel.js';
import {
  getTeams,
  getGames,
  getStadiums,
  simulateRateLimit,
  simulateRateLimitRecovery,
  simulateServerError,
  simulateStadiumsFailureAfterRender,
  simulateSessionExpired,
} from './api/worldCupApi.js';
import { buildItinerary } from './domain/itineraryService.js';

const app = document.querySelector('#app');

const cerrarSesion = () => {
  clearAuth();
  renderLoginScreen(app, { onSuccess: iniciarApp });
};

const manejarSesionExpirada = () => {
  clearAuth();
  showSessionExpiredModal({ onReauthenticated: iniciarApp });
};

// El simulador RF-11 usa esto para aplicar la actualización parcial sin volver a pedir /get/games.
let currentMatchIds = [];

mountDevToolsPanel({
  trigger401: async () => {
    await simulateSessionExpired();
    manejarSesionExpirada();
  },
  trigger429Agota: () => simulateRateLimit('teams'),
  trigger429Recupera: () => simulateRateLimitRecovery('teams'),
  trigger500: () => simulateServerError('teams'),
  triggerFalloEstadios: async () => {
    if (currentMatchIds.length === 0) return;
    try {
      await simulateStadiumsFailureAfterRender();
    } catch (error) {
      markStadiumsUnavailableForCards(app.querySelector('#itinerary-slot'), currentMatchIds);
    }
  },
});

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

  // La API puede devolver 200 con un cuerpo que no es el array esperado (token corrupto no rechazado con 401).
  if (!Array.isArray(teams) || !Array.isArray(games)) {
    console.error('Respuesta inesperada de la API (se esperaba un array):', { teams, games });
    clearAuth();
    renderLoginScreen(app, { onSuccess: iniciarApp });
    return;
  }

  // RF-11: si stadiums falla sin caché, seguimos con array vacío (itineraryService contempla stadium: null).
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
      currentMatchIds = itinerario.matches.map((match) => match.id);
      renderItineraryCards(itinerarySlot, equipoSeleccionado.name_en, equipoSeleccionado.flag, itinerario);
    },
  });
};

if (isAuthenticated()) {
  iniciarApp();
} else {
  renderLoginScreen(app, { onSuccess: iniciarApp });
}
