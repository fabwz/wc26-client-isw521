const ICON_CHEVRON_DOWN = `
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
`;

const ICON_LOG_OUT = `
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
`;

const ICON_USER = `
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
`;

export const renderAccountMenu = (container, user, { onLogout } = {}) => {
  container.innerHTML = `
    <div class="relative">
      <button
        type="button"
        class="account-trigger glass rounded-full pl-1.5 pr-3 py-1.5 flex items-center gap-2 text-white transition hover:bg-white/[0.09] focus-visible:outline focus-visible:outline-2 focus-visible:outline-magenta focus-visible:outline-offset-2"
        aria-haspopup="true"
        aria-expanded="false"
      >
        <span class="w-7 h-7 rounded-full bg-gradient-accent flex items-center justify-center text-white shrink-0">${ICON_USER}</span>
        <span class="body-sm truncate max-w-[120px]">${user?.name ?? 'Usuario'}</span>
        <span class="text-text-secondary">${ICON_CHEVRON_DOWN}</span>
      </button>

      <div
        class="account-dropdown hidden absolute right-0 top-[calc(100%+8px)] w-64 glass rounded-[20px] p-4 flex flex-col gap-3 z-20"
        role="menu"
      >
        <div>
          <p class="body-md text-white truncate">${user?.name ?? 'Usuario'}</p>
          <p class="body-sm text-text-secondary truncate">${user?.email ?? ''}</p>
        </div>

        <span class="self-start glass rounded-full px-2.5 py-1 text-xs text-text-secondary flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          Sesión activa
        </span>

        <div class="border-t border-dashed border-white/[0.16]"></div>

        <button
          type="button"
          class="account-logout flex items-center gap-2 body-sm text-text-secondary hover:text-alert transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-magenta focus-visible:outline-offset-2 rounded-lg"
        >
          ${ICON_LOG_OUT}
          Cerrar sesión
        </button>
      </div>
    </div>
  `;

  const trigger = container.querySelector('.account-trigger');
  const dropdown = container.querySelector('.account-dropdown');
  const botonSalir = container.querySelector('.account-logout');

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

  botonSalir.addEventListener('click', () => {
    cerrar();
    onLogout?.();
  });
};
