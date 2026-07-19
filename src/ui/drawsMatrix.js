import { animateCountUp, escapeHtml } from '../utils/format.js';
import { t } from '../utils/i18n.js';

// RF-RE-03/04: matriz visual de empates agrupada por grupo, con contador por grupo.
// RF-RE-R: la matriz se pinta de forma INCREMENTAL (grupo por grupo, ver renderDrawsMatrixShell +
// appendDrawsGroupSection), nunca de un solo golpe — así un 429 a mitad de la secuencia puede
// dejar ver los grupos ya pintados sin destruirlos, en vez de re-renderizar toda la matriz.

// Índice global de tarjetas de empate ya pintadas, usado para escalonar su animation-delay
// (card-enter) de forma continua a través de los grupos agregados incrementalmente. Se
// reinicia en cada llamada a renderDrawsMatrixShell (nueva construcción de la matriz).
let indiceGlobalDeTarjeta = 0;

// Pinta el encabezado (título + contador total) y deja el contenedor de grupos vacío, listo
// para recibir secciones una por una vía appendDrawsGroupSection.
export const renderDrawsMatrixShell = (container, totalCount) => {
  indiceGlobalDeTarjeta = 0;
  container.innerHTML = `
    <div class="flex flex-wrap items-start justify-between gap-4 mt-6 mb-6">
      <div class="flex-1 min-w-[240px]">
        <h2 class="header-enter font-display text-[1.625rem] leading-[1.875rem] font-bold text-white">${t('draws.title')}</h2>
        <p class="header-enter body-sm text-text-secondary mt-2" style="animation-delay: 60ms">${t('draws.description')}</p>
      </div>
      <div class="text-right">
        <p class="body-sm text-text-secondary">${t('draws.found')}</p>
        <p class="font-display font-extrabold text-4xl bg-gradient-accent bg-clip-text text-transparent" data-draws-count>0</p>
      </div>
    </div>

    <div id="draws-groups-slot" class="flex flex-col gap-6"></div>
  `;
  animateCountUp(container.querySelector('[data-draws-count]'), totalCount);
};

const renderTeamHtml = (name, flag) => `
  <span class="flex items-center gap-2">
    ${flag ? `<img src="${escapeHtml(flag)}" alt="" class="w-5 h-5 rounded-full object-cover shrink-0" />` : ''}
    <span>${escapeHtml(name)}</span>
  </span>
`;

const renderGroupSectionHtml = ({ group, draws }) => `
  <section class="glass rounded-[20px] p-5 flex flex-col gap-4" data-group="${escapeHtml(group)}">
    <header class="flex items-center justify-between">
      <h3 class="font-display font-bold text-white">${t('draws.group')} ${escapeHtml(group)}</h3>
      <span class="glass rounded-full px-2.5 py-0.5 text-xs text-text-secondary font-mono">${draws.length} ${draws.length === 1 ? t('draws.count.one') : t('draws.count.other')}</span>
    </header>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      ${draws.map((draw) => renderDrawCellHtml(draw, indiceGlobalDeTarjeta++)).join('')}
    </div>
  </section>
`;

const renderDrawCellHtml = (draw, indice) => `
  <article
    class="card-enter ticket-card relative overflow-hidden glass rounded-[16px] pl-5 pr-4 py-4 flex flex-col gap-2"
    style="animation-delay: ${indice * 40}ms"
    data-match-id="${draw.id}"
    tabindex="0"
  >
    <span class="ticket-card-accent absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-violet to-magenta"></span>

    <div class="font-display font-bold text-white flex items-center justify-between gap-2 flex-wrap">
      ${renderTeamHtml(draw.homeTeamName, draw.homeTeamFlag)}
      <span class="text-text-secondary">vs</span>
      ${renderTeamHtml(draw.awayTeamName, draw.awayTeamFlag)}
    </div>

    <div class="border-t border-dashed border-white/[0.16]"></div>

    <div class="font-mono text-[0.9375rem] leading-5 flex items-center justify-between">
      <p class="text-white">${escapeHtml(draw.score)} - ${escapeHtml(draw.score)}</p>
      <p class="text-text-secondary text-[0.8125rem]">${escapeHtml(draw.localDate)}</p>
    </div>
  </article>
`;

// `animation-fill-mode: both` deja el transform del último frame por encima del hover de
// .ticket-card sin importar especificidad, así que hay que quitar la clase al terminar
// (mismo patrón que itineraryCards.js/goalsList.js/wallRanking.js).
const releaseCardEnterClass = (seccion) => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  seccion.querySelectorAll('.card-enter').forEach((tarjeta) => {
    if (prefersReducedMotion) {
      tarjeta.classList.remove('card-enter');
      return;
    }
    const quitarClase = () => tarjeta.classList.remove('card-enter');
    tarjeta.addEventListener('animationend', quitarClase, { once: true });
    setTimeout(quitarClase, 400);
  });
};

// RF-RE-R: agrega UN grupo al contenedor ya existente, sin tocar los grupos ya pintados.
// `groupsSlot` es el nodo `#draws-groups-slot` devuelto por renderDrawsMatrixShell.
export const appendDrawsGroupSection = (groupsSlot, group) => {
  groupsSlot.insertAdjacentHTML('beforeend', renderGroupSectionHtml(group));
  releaseCardEnterClass(groupsSlot.lastElementChild);
};
