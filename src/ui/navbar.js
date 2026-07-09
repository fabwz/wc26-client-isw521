// navbar: pill glass flotante (DESIGN.md sección 4.1). Un solo ítem de
// navegación ("Itinerarios") y el menú de cuenta a la derecha. Solo DOM.
import { renderAccountMenu } from './accountMenu.js';

// renderNavbar: dibuja la navbar dentro de `container` y monta accountMenu
// en su slot. onLogout() se reenvía tal cual desde accountMenu.
export const renderNavbar = (container, user, { onLogout } = {}) => {
  container.innerHTML = `
    <nav class="glass rounded-full px-2 py-2 flex items-center gap-1 fixed top-4 left-1/2 -translate-x-1/2 z-30">
      <span class="glass rounded-full px-5 py-2 body-sm font-semibold text-white">Itinerario</span>
      <div id="account-menu-slot" class="ml-1"></div>
    </nav>
  `;

  const accountSlot = container.querySelector('#account-menu-slot');
  renderAccountMenu(accountSlot, user, { onLogout });
};
