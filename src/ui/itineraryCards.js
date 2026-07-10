// itineraryCards: render del itinerario como tarjetas "boleto de cristal"
// (RF-04), nunca como tabla plana. Solo DOM — recibe datos ya cruzados por
// domain/itineraryService.js.
import { formatGroupLabel } from '../utils/format.js';

// Íconos Lucide como SVG inline (DESIGN.md sección 3.1) — nunca el paquete
// npm ni el script CDN, ver .claude/CLAUDE.md.
const ICON_CALENDAR = `
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
`;
const ICON_LANDMARK = `
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>
`;
const ICON_MAP_PIN = `
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
`;
const ICON_USERS = `
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
`;

// renderItineraryCards: dibuja el encabezado (bandera + nombre de equipo y el
// contador de ciudades distintas, RF-05) y una tarjeta por partido
// (RF-02/RF-03), en el orden ya provisto por buildItinerary (ordenado por
// local_date). `teamFlag` es la URL que ya trae /get/teams, sin generarla.
export const renderItineraryCards = (container, teamName, teamFlag, { matches, citiesVisitedCount }) => {
  container.innerHTML = `
    <div class="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div class="flex items-center gap-3">
        ${teamFlag ? `<img src="${teamFlag}" alt="" class="w-10 h-10 rounded-full object-cover shrink-0" />` : ''}
        <h2 class="font-display text-[26px] leading-[30px] font-bold text-white">${teamName}</h2>
      </div>
      <div class="text-right">
        <p class="body-sm text-text-secondary">Ciudades visitadas</p>
        <p class="font-display font-extrabold text-4xl bg-gradient-accent bg-clip-text text-transparent">${citiesVisitedCount}</p>
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      ${matches.map((match, indice) => renderCardHtml(match, indice)).join('')}
    </div>
  `;
  releaseCardEnterClass(container);
};

// releaseCardEnterClass: quita `card-enter` de cada tarjeta cuando termina su
// animación de aparición. Es necesario porque `animation-fill-mode: both`
// deja el `transform: translateY(0)` del último frame "vivo" por encima de
// cualquier transform normal del autor (incluido el hover de .ticket-card),
// sin importar especificidad — por eso el hover se veía tachado en DevTools.
// Con `prefers-reduced-motion: reduce` quitamos la clase de inmediato (no
// hace falta esperar nada, la animación no se percibe) y además dejamos un
// setTimeout corto como respaldo por si `animationend` no llegara a disparar
// con duración ~0 en algún navegador.
const releaseCardEnterClass = (container) => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  container.querySelectorAll('.card-enter').forEach((tarjeta) => {
    if (prefersReducedMotion) {
      tarjeta.classList.remove('card-enter');
      return;
    }
    const quitarClase = () => tarjeta.classList.remove('card-enter');
    tarjeta.addEventListener('animationend', quitarClase, { once: true });
    setTimeout(quitarClase, 400);
  });
};

// renderCardHtml: markup de una sola tarjeta de partido. `indice` alimenta el
// stagger de aparición (40ms entre tarjetas, DESIGN.md sección 6). El acento
// de degradado va solo en el borde izquierdo (pseudo-elemento posicionado),
// nunca como border-image alrededor de toda la tarjeta.
const renderCardHtml = (match, indice) => `
  <article
    class="card-enter ticket-card relative overflow-hidden glass rounded-[20px] pl-6 pr-5 py-5 flex flex-col gap-3"
    style="animation-delay: ${indice * 40}ms"
    data-match-id="${match.id}"
  >
    <span class="ticket-card-accent absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-violet to-magenta"></span>

    <header class="flex items-center justify-between gap-2">
      <h3 class="font-display font-bold text-white">${match.homeTeamName} vs ${match.awayTeamName}</h3>
      <span class="glass rounded-full px-2.5 py-0.5 text-xs text-text-secondary shrink-0">${formatGroupLabel(match.group)}</span>
    </header>

    <div class="border-t border-dashed border-white/[0.16]"></div>

    <div class="font-mono text-[15px] leading-5 flex flex-col gap-2">
      <p class="flex items-center gap-2 text-white"><span class="text-text-secondary">${ICON_CALENDAR}</span>${match.localDate}</p>
      <div data-stadium-fields>${renderStadiumFieldsHtml(match.stadium)}</div>
    </div>
  </article>
`;

// renderStadiumFieldsHtml: filas de estadio/ciudad/aforo, o el estado
// degradado "Estadio no disponible" (RF-11) si el cruce con stadiums no
// tiene datos para ese stadium_id. El aforo queda alineado igual que el
// resto de filas (ícono + valor), no empujado al borde derecho.
const renderStadiumFieldsHtml = (stadium) => {
  if (!stadium) {
    return `<p class="flex items-center gap-2 text-text-secondary italic"><span>${ICON_LANDMARK}</span>Estadio no disponible</p>`;
  }
  return `
    <p class="flex items-center gap-2 text-white"><span class="text-text-secondary">${ICON_LANDMARK}</span>${stadium.name}</p>
    <p class="flex items-center gap-2 text-text-secondary"><span>${ICON_MAP_PIN}</span>${stadium.cityCountry}</p>
    <p class="flex items-center gap-2 text-white"><span class="text-text-secondary">${ICON_USERS}</span>${stadium.capacity.toLocaleString()}</p>
  `;
};

// markStadiumsUnavailableForCards: actualización PARCIAL por tarjeta (RF-11 /
// CLAUDE.md 5.5). Cuando `/get/stadiums` falla después de que el itinerario
// ya se renderizó con partidos reales, esta función reemplaza únicamente el
// bloque `[data-stadium-fields]` (estadio + ciudad/país) de las tarjetas
// afectadas por el estado degradado "Estadio no disponible" — nunca vuelve a
// tocar `container.innerHTML` completo, así que el resto de cada tarjeta
// (equipos, fecha, grupo, borde de degradado) permanece intacto y ninguna
// tarjeta ya renderizada desaparece o se reordena.
export const markStadiumsUnavailableForCards = (container, matchIds) => {
  matchIds.forEach((matchId) => {
    const tarjeta = container.querySelector(`article[data-match-id="${matchId}"]`);
    const camposEstadio = tarjeta?.querySelector('[data-stadium-fields]');
    if (camposEstadio) {
      camposEstadio.innerHTML = renderStadiumFieldsHtml(null);
    }
  });
};
