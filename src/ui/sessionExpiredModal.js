import { renderLoginForm } from './loginForm.js';
import { t } from '../utils/i18n.js';

let modalActual = null;

export const showSessionExpiredModal = ({ onReauthenticated } = {}) => {
  if (modalActual) return; // evita apilar overlays si ya hay uno abierto

  const overlay = document.createElement('div');
  overlay.className =
    'fixed inset-0 z-50 flex items-center justify-center bg-void/70 backdrop-blur-md px-4 modal-enter';
  overlay.innerHTML = '<div id="session-expired-form-slot" class="w-full flex justify-center"></div>';

  document.body.appendChild(overlay);
  modalActual = overlay;

  const slot = overlay.querySelector('#session-expired-form-slot');
  renderLoginForm(slot, {
    subtitle: t('login.sessionExpiredSubtitle'),
    alertMessage: t('login.sessionExpiredAlert'),
    onSuccess: (user) => {
      closeSessionExpiredModal();
      onReauthenticated?.(user);
    },
  });
};

export const closeSessionExpiredModal = () => {
  modalActual?.remove();
  modalActual = null;
};
