import { isAuthenticated, clearAuth, getUser } from './state/appState.js';
import { ApiError } from './api/httpClient.js';
import { renderLoginScreen } from './ui/loginForm.js';
import { renderNavbar } from './ui/navbar.js';
import { renderTeamSelector } from './ui/teamSelector.js';
import { renderItineraryCards, markStadiumsUnavailableForCards } from './ui/itineraryCards.js';
import { renderGoalsList, patchTeamNamesForCards } from './ui/goalsList.js';
import { renderStadiumsChart, markGamesUnavailableForStadiumsChart } from './ui/stadiumsChart.js';
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
  simulateTeamsFailureAfterGamesResolved,
  simulateGamesFailureAfterStadiumsResolved,
  simulateSessionExpired,
} from './api/worldCupApi.js';
import { buildItinerary } from './domain/itineraryService.js';
import { buildGoalsList, reconcileGoalsListWithTeams } from './domain/goalsService.js';
import { buildStadiumsAnalytics, buildStadiumsBaseline } from './domain/stadiumsAnalyticsService.js';
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

// RF-RG-R: fuerza que la próxima carga de Rastreador de Goleadas trate /get/teams como fallido
// (se consume una sola vez); ver renderRastreadorDeGoleadas.
let forzarFalloTeamsEnGoleadas = false;

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
  triggerFalloEquipos: () => {
    forzarFalloTeamsEnGoleadas = true;
    if (vistaActiva === 'rastreador-de-goleadas') {
      renderRastreadorDeGoleadas(app.querySelector('#view-slot'));
    }
  },
  triggerFalloPartidosEstadios: async () => {
    const chartSlot = app.querySelector('#stadiums-chart-slot');
    if (!chartSlot) return;
    try {
      await simulateGamesFailureAfterStadiumsResolved(banners);
    } catch (error) {
      markGamesUnavailableForStadiumsChart(chartSlot);
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

// teams/games se comparten entre subproyectos (2.1 y 2.2 por ahora) para no duplicar la petición
// si ya están en memoria desde la infraestructura compartida.
let teamsYGamesEnMemoria = null;

const obtenerTeamsYGames = async () => {
  if (teamsYGamesEnMemoria) return teamsYGamesEnMemoria;

  const [teams, games] = await Promise.all([getTeams(banners), getGames(banners)]);

  // La API puede devolver 200 con un cuerpo que no es el array esperado (token corrupto no rechazado con 401).
  if (!Array.isArray(teams) || !Array.isArray(games)) {
    console.error('Respuesta inesperada de la API (se esperaba un array):', { teams, games });
    throw new Error('Respuesta inesperada de teams/games');
  }

  teamsYGamesEnMemoria = { teams, games };
  return teamsYGamesEnMemoria;
};

// stadiums/games se comparten con la infraestructura ya en memoria (2.1 puede haber pedido
// stadiums, 2.1/2.2 pueden haber pedido games) para no duplicar peticiones ya resueltas.
let stadiumsEnMemoria = null;
let gamesParaAnaliticaEnMemoria = null;

// RF-AE-R (requirements.md 11): stadiums y games se piden en orden controlado, no en
// Promise.all — si games fallara sin que stadiums ya haya resuelto, no habría barras que
// preservar. Al pedir stadiums primero y renderizar sus barras de aforo (RF-AE-01/02
// pendientes de conteo) antes de tocar games, un fallo posterior de games nunca puede
// destruir lo ya dibujado: solo actualiza la fila de partidos vía
// markGamesUnavailableForStadiumsChart, sin re-renderizar la grilla completa.
const renderAnaliticaDeEstadios = async (container) => {
  container.innerHTML = '<div id="stadiums-chart-slot"></div>';
  const chartSlot = container.querySelector('#stadiums-chart-slot');

  let stadiums;
  try {
    stadiums = stadiumsEnMemoria ?? (await getStadiums(banners));
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      manejarSesionExpirada();
      return;
    }
    console.error('Fallo al cargar stadiums (sin caché disponible):', error);
    clearAuth();
    renderLoginScreen(app, { onSuccess: iniciarApp });
    return;
  }
  if (!Array.isArray(stadiums)) {
    console.error('Respuesta inesperada de la API (se esperaba un array):', { stadiums });
    clearAuth();
    renderLoginScreen(app, { onSuccess: iniciarApp });
    return;
  }
  stadiumsEnMemoria = stadiums;

  renderStadiumsChart(chartSlot, buildStadiumsBaseline(stadiums));

  let games;
  try {
    games = gamesParaAnaliticaEnMemoria ?? teamsYGamesEnMemoria?.games ?? (await getGames(banners));
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      manejarSesionExpirada();
      return;
    }
    console.error('Fallo al cargar games (barras de estadios ya renderizadas, se conservan):', error);
    markGamesUnavailableForStadiumsChart(chartSlot);
    return;
  }
  if (!Array.isArray(games)) {
    console.error('Respuesta inesperada de la API (se esperaba un array):', { games });
    markGamesUnavailableForStadiumsChart(chartSlot);
    return;
  }
  gamesParaAnaliticaEnMemoria = games;

  renderStadiumsChart(chartSlot, buildStadiumsAnalytics(stadiums, games));
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
    ({ teams, games } = await obtenerTeamsYGames());
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

// RF-RG-R usa esto para volver a cruzar ids con nombres reales cuando /get/teams se
// recupera en segundo plano, sobre la misma vista ya renderizada.
let currentGoleadasMatches = [];

const renderRastreadorDeGoleadas = async (container) => {
  container.innerHTML = '<div id="goals-slot"></div>';
  const goalsSlot = container.querySelector('#goals-slot');

  // Si ambos ya están en memoria (ej. se visitó primero La Ruta del Campeón) se reutilizan
  // sin re-pedirlos — salvo que el simulador dev esté forzando el escenario RF-RG-R.
  if (teamsYGamesEnMemoria && !forzarFalloTeamsEnGoleadas) {
    const goleadas = buildGoalsList(teamsYGamesEnMemoria.games, teamsYGamesEnMemoria.teams);
    currentGoleadasMatches = goleadas.matches;
    renderGoalsList(goalsSlot, goleadas);
    return;
  }

  // RF-RG-R: games y teams se piden por separado (no Promise.all) para que un fallo
  // aislado de /get/teams no bloquee la vista si /get/games ya respondió.
  let games;
  try {
    games = await getGames(banners);
    if (!Array.isArray(games)) throw new Error('Respuesta inesperada de /get/games');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      manejarSesionExpirada();
      return;
    }
    console.error('Fallo al cargar games (sin caché disponible):', error);
    clearAuth();
    renderLoginScreen(app, { onSuccess: iniciarApp });
    return;
  }

  let teams = null;
  try {
    if (forzarFalloTeamsEnGoleadas) {
      forzarFalloTeamsEnGoleadas = false;
      await simulateTeamsFailureAfterGamesResolved(banners); // SOLO DEV: siempre lanza.
    }
    teams = await getTeams(banners);
    if (!Array.isArray(teams)) throw new Error('Respuesta inesperada de /get/teams');
    teamsYGamesEnMemoria = { teams, games };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      manejarSesionExpirada();
      return;
    }
    // Degradación RF-RG-R: sin caché de teams no se bloquea la vista, se sigue con ids crudos.
    console.error('Fallo al cargar teams (RF-RG-R: se muestran ids crudos y se reintenta en segundo plano):', error);
    teams = null;
  }

  const goleadas = buildGoalsList(games, teams);
  currentGoleadasMatches = goleadas.matches;
  renderGoalsList(goalsSlot, goleadas);

  if (!teams) {
    reintentarTeamsParaGoleadas(goalsSlot, games);
  }
};

// RF-RG-R: reintenta /get/teams en segundo plano (getTeams ya usa fetchWithBackoff
// internamente vía fetchDatasetResiliente) y, si se recupera, parchea solo los nombres/banderas
// de las tarjetas ya renderizadas — sin volver a pedir /get/games ni recargar la página.
const reintentarTeamsParaGoleadas = async (goalsSlot, games) => {
  try {
    const teamsRecuperados = await getTeams(banners);
    if (!Array.isArray(teamsRecuperados)) return;

    teamsYGamesEnMemoria = { teams: teamsRecuperados, games };

    // El usuario pudo haber cambiado de vista mientras el backoff seguía en curso.
    if (!goalsSlot.isConnected) return;

    currentGoleadasMatches = reconcileGoalsListWithTeams(currentGoleadasMatches, teamsRecuperados);
    patchTeamNamesForCards(goalsSlot, currentGoleadasMatches);
    console.debug('[resiliencia] RF-RG-R — /get/teams se recuperó, nombres reales aplicados sobre la vista ya renderizada');
  } catch (error) {
    console.error('Fallo al reintentar /get/teams en segundo plano (RF-RG-R):', error);
  }
};

const renderVistaActiva = async (viewSlot) => {
  if (vistaActiva === 'ruta-del-campeon') {
    await renderRutaDelCampeon(viewSlot);
  } else if (vistaActiva === 'rastreador-de-goleadas') {
    await renderRastreadorDeGoleadas(viewSlot);
  } else if (vistaActiva === 'analitica-de-estadios') {
    await renderAnaliticaDeEstadios(viewSlot);
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
