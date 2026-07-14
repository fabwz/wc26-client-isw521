import { isAuthenticated, clearAuth, getUser } from './state/appState.js';
import { ApiError } from './api/httpClient.js';
import { renderLoginScreen } from './ui/loginForm.js';
import { renderNavbar } from './ui/navbar.js';
import { renderTeamSelector } from './ui/teamSelector.js';
import { renderItineraryCards, markStadiumsUnavailableForCards } from './ui/itineraryCards.js';
import { showSessionExpiredModal } from './ui/sessionExpiredModal.js';
import { mountDevToolsPanel } from './ui/devToolsPanel.js';
import {
  showRateLimitBanner,
  hideRateLimitBanner,
  showServerErrorBanner,
  hideServerErrorBanner,
  showCacheBanner,
  hideCacheBanner,
} from './ui/resilienceBanners.js';
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
import { PROJECTS } from './ui/projectMenu.js';

// worldCupApi.js no conoce la UI: main.js inyecta estos callbacks (RF-09/RF-10)
// en cada llamada a getTeams/getGames/getStadiums/simulate* — ver worldCupApi.js.
const banners = {
  showRateLimitBanner,
  hideRateLimitBanner,
  showServerErrorBanner,
  hideServerErrorBanner,
  showCacheBanner,
  hideCacheBanner,
};

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
  trigger429Agota: () => simulateRateLimit('teams', banners),
  trigger429Recupera: () => simulateRateLimitRecovery('teams', banners),
  trigger500: () => simulateServerError('teams', banners),
  triggerFalloEstadios: async () => {
    if (currentMatchIds.length === 0) return;
    try {
      await simulateStadiumsFailureAfterRender(banners);
    } catch (error) {
      markStadiumsUnavailableForCards(app.querySelector('#itinerary-slot'), currentMatchIds);
    }
  },
});

// Vista activa entre los 5 subproyectos (sin librería de router, switch de estado + render condicional).
let vistaActiva = 'ruta-del-campeon';

const renderVistaEnConstruccion = (container, proyectoId) => {
  const proyecto = PROJECTS.find((item) => item.id === proyectoId);
  container.innerHTML = `
    <div class="glass rounded-[20px] p-8 flex flex-col items-center gap-2 text-center max-w-md mx-auto">
      <p class="display-md text-white">${proyecto?.name ?? 'Proyecto'}</p>
      <p class="body-md text-text-secondary">Esta vista está en construcción. Pronto disponible.</p>
    </div>
  `;
};

const renderRutaDelCampeon = async (container) => {
  container.innerHTML = `
    <div id="team-selector-slot" class="max-w-xs"></div>
    <div id="itinerary-slot"></div>
  `;

  const selectorSlot = container.querySelector('#team-selector-slot');
  const itinerarySlot = container.querySelector('#itinerary-slot');

  let teams;
  let games;

  try {
    [teams, games] = await Promise.all([getTeams(banners), getGames(banners)]);
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
    stadiums = await getStadiums(banners);
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

const renderVistaActiva = async (viewSlot) => {
  if (vistaActiva === 'ruta-del-campeon') {
    await renderRutaDelCampeon(viewSlot);
  } else {
    renderVistaEnConstruccion(viewSlot, vistaActiva);
  }
};

const iniciarApp = async () => {
  app.innerHTML = `
    <div id="navbar-slot"></div>
    <main class="min-h-screen px-4 py-24 max-w-5xl mx-auto flex flex-col gap-8">
      <div id="view-slot"></div>
    </main>
  `;

  const viewSlot = app.querySelector('#view-slot');
  const navbarSlot = app.querySelector('#navbar-slot');

  const seleccionarProyecto = async (proyectoId) => {
    if (proyectoId === vistaActiva) return;
    vistaActiva = proyectoId;
    renderNavbar(navbarSlot, getUser(), {
      onLogout: cerrarSesion,
      activeProjectId: vistaActiva,
      onProjectSelected: seleccionarProyecto,
    });
    await renderVistaActiva(viewSlot);
  };

  renderNavbar(navbarSlot, getUser(), {
    onLogout: cerrarSesion,
    activeProjectId: vistaActiva,
    onProjectSelected: seleccionarProyecto,
  });

  await renderVistaActiva(viewSlot);
};

if (isAuthenticated()) {
  iniciarApp();
} else {
  renderLoginScreen(app, { onSuccess: iniciarApp });
}
