import { renderAccountMenu } from './accountMenu.js';
import { renderProjectMenu } from './projectMenu.js';

export const renderNavbar = (container, user, { onLogout, activeProjectId, onProjectSelected } = {}) => {
  container.innerHTML = `
    <nav class="glass rounded-full px-2 py-2 flex items-center gap-1 fixed top-4 left-1/2 -translate-x-1/2 z-30">
      <img src="/logo.png" alt="La Ruta del Campeón" class="h-36 w-auto -my-14 translate-y-4 pl-2 pr-1" />
      <div id="project-menu-slot"></div>
      <div id="account-menu-slot" class="ml-1"></div>
    </nav>
  `;

  const projectSlot = container.querySelector('#project-menu-slot');
  renderProjectMenu(projectSlot, activeProjectId, { onSelect: onProjectSelected });

  const accountSlot = container.querySelector('#account-menu-slot');
  renderAccountMenu(accountSlot, user, { onLogout });
};
