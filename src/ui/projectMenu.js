const ICON_CHEVRON_DOWN = `
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
`;

export const PROJECTS = [
  { id: 'ruta-del-campeon', name: 'La Ruta del Campeón' },
  { id: 'rastreador-de-goleadas', name: 'Rastreador de Goleadas' },
  { id: 'el-muro', name: 'El Muro' },
  { id: 'analitica-de-estadios', name: 'Analítica de Estadios' },
  { id: 'radar-de-empates', name: 'Radar de Empates' },
];

export const renderProjectMenu = (container, activeProjectId, { onSelect } = {}) => {
  const proyectoActivo = PROJECTS.find((proyecto) => proyecto.id === activeProjectId) ?? PROJECTS[0];

  container.innerHTML = `
    <div class="relative">
      <button
        type="button"
        class="project-trigger glass rounded-full pl-4 pr-3 py-1.5 flex items-center gap-2 text-white transition hover:bg-white/[0.09] focus-visible:outline focus-visible:outline-2 focus-visible:outline-magenta focus-visible:outline-offset-2"
        aria-haspopup="true"
        aria-expanded="false"
      >
        <span class="body-sm truncate max-w-[160px]">${proyectoActivo.name}</span>
        <span class="text-text-secondary">${ICON_CHEVRON_DOWN}</span>
      </button>

      <div
        class="project-dropdown hidden absolute left-0 top-[calc(100%+8px)] w-64 glass rounded-[20px] p-2 flex flex-col gap-1 z-20"
        role="menu"
      >
        ${PROJECTS.map((proyecto) => `
          <button
            type="button"
            data-project-id="${proyecto.id}"
            class="project-option text-left body-sm rounded-lg px-3 py-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-magenta focus-visible:outline-offset-2 ${
              proyecto.id === proyectoActivo.id
                ? 'text-white bg-white/[0.09]'
                : 'text-text-secondary hover:text-white hover:bg-white/[0.09]'
            }"
            role="menuitem"
          >
            ${proyecto.name}
          </button>
        `).join('')}
      </div>
    </div>
  `;

  const trigger = container.querySelector('.project-trigger');
  const dropdown = container.querySelector('.project-dropdown');

  const abrir = () => {
    dropdown.classList.remove('hidden');
    trigger.setAttribute('aria-expanded', 'true');
  };

  const cerrar = () => {
    dropdown.classList.add('hidden');
    trigger.setAttribute('aria-expanded', 'false');
  };

  trigger.addEventListener('click', (evento) => {
    evento.stopPropagation();
    if (dropdown.classList.contains('hidden')) {
      abrir();
    } else {
      cerrar();
    }
  });

  document.addEventListener('click', (evento) => {
    if (!container.contains(evento.target)) {
      cerrar();
    }
  });

  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') {
      cerrar();
    }
  });

  container.querySelectorAll('.project-option').forEach((boton) => {
    boton.addEventListener('click', () => {
      cerrar();
      onSelect?.(boton.dataset.projectId);
    });
  });
};
