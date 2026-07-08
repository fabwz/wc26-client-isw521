// itineraryCards: render del itinerario como tarjetas "boleto de cristal"
// (RF-04), nunca como tabla plana. Solo DOM — recibe datos ya cruzados por
// domain/itineraryService.js.
import { formatGroupLabel } from '../utils/format.js';

// renderItineraryCards: dibuja el contador de ciudades distintas (RF-05) y
// una tarjeta por partido (RF-02/RF-03), en el orden ya provisto por
// buildItinerary (ordenado por local_date).
export const renderItineraryCards = (container, teamName, { matches, citiesVisitedCount }) => {
  container.innerHTML = `
    <div class="flex flex-wrap items-baseline gap-3 mb-6">
      <h2 class="font-display text-[26px] leading-[30px] font-bold text-white">${teamName}</h2>
      <p class="body-md text-text-secondary">
        Ciudades visitadas:
        <span class="font-display font-bold bg-gradient-accent bg-clip-text text-transparent">${citiesVisitedCount}</span>
      </p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      ${matches.map(renderCardHtml).join('')}
    </div>
  `;
};

// renderCardHtml: markup de una sola tarjeta de partido.
const renderCardHtml = (match) => `
  <article class="glass rounded-[20px] border-l-2 [border-image:linear-gradient(180deg,#7C3AED,#EC4899)_1] p-5 flex flex-col gap-3">
    <header class="flex items-center justify-between gap-2">
      <h3 class="font-display font-bold text-white">${match.homeTeamName} vs ${match.awayTeamName}</h3>
      <span class="glass rounded-full px-2.5 py-0.5 text-xs text-text-secondary shrink-0">${formatGroupLabel(match.group)}</span>
    </header>

    <div class="border-t border-dashed border-white/[0.16]"></div>

    <div class="font-mono text-[15px] leading-5 flex flex-col gap-1.5">
      <p class="text-white">${match.localDate}</p>
      ${renderStadiumFieldsHtml(match.stadium)}
    </div>
  </article>
`;

// renderStadiumFieldsHtml: filas de estadio/ciudad/aforo, o el estado
// degradado "Estadio no disponible" (RF-11) si el cruce con stadiums no
// tiene datos para ese stadium_id.
const renderStadiumFieldsHtml = (stadium) => {
  if (!stadium) {
    return '<p class="text-text-secondary italic">Estadio no disponible</p>';
  }
  return `
    <p class="text-white">${stadium.name}</p>
    <p class="text-text-secondary">${stadium.cityCountry}</p>
    <p class="text-white text-right">Aforo ${stadium.capacity.toLocaleString()}</p>
  `;
};
