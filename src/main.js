import { isAuthenticated, clearAuth } from './state/appState.js';
import { renderLoginScreen } from './ui/loginForm.js';
import { renderTeamSelector } from './ui/teamSelector.js';
import { renderItineraryCards } from './ui/itineraryCards.js';
import { getTeams, getGames, getStadiums } from './api/worldCupApi.js';
import { buildItinerary } from './domain/itineraryService.js';

const app = document.querySelector('#app');

// iniciarApp: monta la vista Itinerarios (selector de equipo + tarjetas).
// Camino feliz por ahora: sin backoff ni manejo de 429/500/offline (RF-09 a
// RF-11 se conectan en un commit aparte). El 401 sí se cubre aquí como caso
// mínimo: sin esto, un token inválido dejaba el selector intentando iterar
// datos vacíos/erróneos en vez de devolver al usuario al login.
const iniciarApp = async () => {
  app.innerHTML = `
    <main class="min-h-screen px-4 py-24 max-w-5xl mx-auto flex flex-col gap-8">
      <div id="team-selector-slot" class="max-w-xs"></div>
      <div id="itinerary-slot"></div>
    </main>
  `;

  const selectorSlot = app.querySelector('#team-selector-slot');
  const itinerarySlot = app.querySelector('#itinerary-slot');

  let teams;
  let games;
  let stadiums;

  try {
    // Las 3 peticiones se disparan en paralelo; no importa el orden en que
    // resuelvan (RNF-03), Promise.all las junta antes de poblar el selector.
    [teams, games, stadiums] = await Promise.all([getTeams(), getGames(), getStadiums()]);
  } catch (error) {
    console.error('Fallo al cargar teams/games/stadiums:', error);
    clearAuth();
    renderLoginScreen(app, { onSuccess: iniciarApp });
    return;
  }

  // authFetch no siempre lanza (ej. respuesta 200 con un cuerpo que no es el
  // array esperado, típico de un token corrupto que la API no rechaza con
  // 401 de forma explícita) — validamos la forma de los datos como frontera
  // con la API externa antes de asumir que la sesión es válida.
  if (!Array.isArray(teams) || !Array.isArray(games) || !Array.isArray(stadiums)) {
    console.error('Respuesta inesperada de la API (se esperaba un array):', { teams, games, stadiums });
    clearAuth();
    renderLoginScreen(app, { onSuccess: iniciarApp });
    return;
  }

  renderTeamSelector(selectorSlot, teams, {
    onTeamSelected: (selectedTeamId) => {
      const equipoSeleccionado = teams.find((team) => team.id === selectedTeamId);
      const itinerario = buildItinerary(selectedTeamId, teams, games, stadiums);
      renderItineraryCards(itinerarySlot, equipoSeleccionado.name_en, itinerario);
    },
  });
};

if (isAuthenticated()) {
  iniciarApp();
} else {
  renderLoginScreen(app, { onSuccess: iniciarApp });
}
