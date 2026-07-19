import { formatGroupLabel, animateCountUp, escapeHtml } from '../utils/format.js';
import { t } from '../utils/i18n.js';

// Íconos Lucide como SVG inline (CLAUDE.md 2), nunca el paquete npm ni el script CDN.
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

export const renderItineraryCards = (container, teamName, teamFlag, { matches, citiesVisitedCount }) => {
  container.innerHTML = `
    <div class="flex flex-wrap items-start justify-between gap-4 mt-6 mb-6">
      <div class="flex items-center gap-3">
        ${teamFlag ? `<img src="${escapeHtml(teamFlag)}" alt="" class="w-10 h-10 rounded-full object-cover shrink-0" />` : ''}
        <h2 class="font-display text-[1.625rem] leading-[1.875rem] font-bold text-white">${escapeHtml(teamName)}</h2>
      </div>
      <div class="text-right">
        <p class="body-sm text-text-secondary">${t('itinerary.citiesVisited')}</p>
        <p class="font-display font-extrabold text-4xl bg-gradient-accent bg-clip-text text-transparent" data-cities-count>0</p>
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      ${matches.map((match, indice) => renderCardHtml(match, indice)).join('')}
    </div>
  `;
  releaseCardEnterClass(container);
  animateCountUp(container.querySelector('[data-cities-count]'), citiesVisitedCount);
};

// `animation-fill-mode: both` deja el transform del último frame por encima del
// hover de .ticket-card sin importar especificidad, así que hay que quitar la clase al terminar.
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

const renderCardHtml = (match, indice) => `
  <article
    class="card-enter ticket-card relative overflow-hidden glass rounded-[20px] pl-6 pr-5 py-5 flex flex-col gap-3"
    style="animation-delay: ${indice * 40}ms"
    data-match-id="${match.id}"
    tabindex="0"
  >
    <span class="ticket-card-accent absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-violet to-magenta"></span>

    <header class="flex items-center justify-between gap-2">
      <h3 class="font-display font-bold text-white">${escapeHtml(match.homeTeamName)} vs ${escapeHtml(match.awayTeamName)}</h3>
      <span class="glass rounded-full px-2.5 py-0.5 text-xs text-text-secondary shrink-0">${formatGroupLabel(match.group)}</span>
    </header>

    <div class="border-t border-dashed border-white/[0.16]"></div>

    <div class="font-mono text-[0.9375rem] leading-5 flex flex-col gap-2">
      <p class="flex items-center gap-2 text-white"><span class="text-text-secondary">${ICON_CALENDAR}</span>${escapeHtml(match.localDate)}</p>
      <div data-stadium-fields>${renderStadiumFieldsHtml(match.stadium)}</div>
    </div>
  </article>
`;

const renderStadiumFieldsHtml = (stadium) => {
  if (!stadium) {
    return `<p class="flex items-center gap-2 text-text-secondary italic"><span>${ICON_LANDMARK}</span>${t('itinerary.stadiumUnavailable')}</p>`;
  }
  return `
    <p class="flex items-center gap-2 text-white"><span class="text-text-secondary">${ICON_LANDMARK}</span>${escapeHtml(stadium.name)}</p>
    <p class="flex items-center gap-2 text-text-secondary"><span>${ICON_MAP_PIN}</span>${escapeHtml(stadium.cityCountry)}</p>
    <p class="flex items-center gap-2 text-white"><span class="text-text-secondary">${ICON_USERS}</span>${stadium.capacity.toLocaleString()}</p>
  `;
};

// Actualización PARCIAL (RF-11): solo reemplaza [data-stadium-fields], nunca container.innerHTML completo.
export const markStadiumsUnavailableForCards = (container, matchIds) => {
  matchIds.forEach((matchId) => {
    const tarjeta = container.querySelector(`article[data-match-id="${matchId}"]`);
    const camposEstadio = tarjeta?.querySelector('[data-stadium-fields]');
    if (camposEstadio) {
      camposEstadio.innerHTML = renderStadiumFieldsHtml(null);
    }
  });
};
