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

// currentMatchIds: ids de las tarjetas de partidos actualmente en pantalla
// (poblado por onTeamSelected). El simulador de RF-11 lo necesita para saber
// a qué tarjetas aplicarles la actualización parcial — no dispara ninguna
// petición nueva a /get/games, solo lee este arreglo en memoria.
let currentMatchIds = [];

// Panel único (🐛, esquina inferior derecha) visible solo en `npm run dev`
// que agrupa los 5 simuladores — antes eran 5 botones sueltos compitiendo
// por espacio con las tarjetas de itinerario. Cada trigger es el mismo que
// ya existía; devToolsPanel.js solo decide dónde se dibuja el botón, no
// cambia el comportamiento ni los atajos de teclado (ver devToolsPanel.js).
mountDevToolsPanel({
  // RF-08: fetch() real a httpstat.us/401 (simulateSessionExpired,
  // worldCupApi.js) para que la clasificación real construya el
  // ApiError(401) — visible en Network — y solo entonces manejarSesionExpirada.
  trigger401: async () => {
    await simulateSessionExpired();
    manejarSesionExpirada();
  },
  // RF-09: countdown de backoff sin depender de ganarle a la caché HTTP de
  // 30s del servidor real — ver simulateRateLimit/simulateRateLimitRecovery.
  trigger429Agota: () => simulateRateLimit('teams'),
  trigger429Recupera: () => simulateRateLimitRecovery('teams'),
  // RF-09: banner "Error de servidor · reintentando conexión..." con barra
  // de progreso — ver simulateServerError.
  trigger500: () => simulateServerError('teams'),
  // RF-11: falla SOLO /get/stadiums después de que el itinerario ya está
  // renderizado con datos reales de /get/games y /get/teams. Si no hay
  // itinerario en pantalla, no hace nada.
  triggerFalloEstadios: async () => {
    if (currentMatchIds.length === 0) return;
    try {
      await simulateStadiumsFailureAfterRender();
    } catch (error) {
      // Fallo aislado y esperado (RF-11): actualización PARCIAL por tarjeta,
      // nunca un re-render completo de itinerary-slot — las tarjetas ya
      // renderizadas permanecen intactas salvo el bloque de estadio.
      markStadiumsUnavailableForCards(app.querySelector('#itinerary-slot'), currentMatchIds);
    }
  },
});

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
