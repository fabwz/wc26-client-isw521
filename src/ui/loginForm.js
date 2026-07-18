import { login } from '../domain/authService.js';
import { ApiError } from '../api/httpClient.js';
import { t } from '../utils/i18n.js';

// Traduce el status HTTP a un mensaje de error para el usuario, sin jerga
// técnica ("token", "JWT", etc. quedan fuera de la UI).
const mensajeError = (error) => {
  if (!(error instanceof ApiError)) {
    return t('login.error.network');
  }
  if (error.status === 401) {
    return t('login.error.401');
  }
  if (error.status === 429) {
    return t('login.error.429');
  }
  if (error.status >= 500) {
    return t('login.error.500');
  }
  return t('login.error.unexpected');
};

// Se reutiliza tal cual dentro del modal de sesión expirada (RF-08).
// `alertMessage` va DENTRO de esta misma tarjeta glass (no una tarjeta aparte
// encima) para evitar el doble blur/borde de dos superficies glass apiladas.
export const renderLoginForm = (container, { onSuccess, subtitle, alertMessage } = {}) => {
  const clasesBorde = alertMessage ? 'border-t-2 border-t-alert' : '';

  container.innerHTML = `
    <form class="glass rounded-3xl p-8 w-full max-w-[380px] flex flex-col gap-5 ${clasesBorde}" novalidate>
      ${alertMessage ? `<p class="body-sm text-alert font-semibold text-center -mb-1">${alertMessage}</p>` : ''}
      <div>
        <h1 class="font-display text-[1.625rem] leading-[1.875rem] font-bold text-white">${t('login.title')}</h1>
        ${subtitle ? `<p class="body-sm text-text-secondary mt-2">${subtitle}</p>` : ''}
      </div>

      <label class="flex flex-col gap-1.5">
        <span class="body-sm text-text-secondary">${t('login.email')}</span>
        <input
          type="email"
          name="email"
          required
          autocomplete="email"
          placeholder="${t('login.emailPlaceholder')}"
          class="bg-white/[0.04] border border-white/[0.14] rounded-xl px-4 py-3 text-white placeholder:text-text-secondary/60 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-magenta focus-visible:outline-offset-2 transition"
        />
      </label>

      <label class="flex flex-col gap-1.5">
        <span class="body-sm text-text-secondary">${t('login.password')}</span>
        <input
          type="password"
          name="password"
          required
          autocomplete="current-password"
          placeholder="••••••••"
          class="bg-white/[0.04] border border-white/[0.14] rounded-xl px-4 py-3 text-white placeholder:text-text-secondary/60 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-magenta focus-visible:outline-offset-2 transition"
        />
      </label>

      <p class="login-error hidden body-sm text-alert" role="alert"></p>

      <button
        type="submit"
        class="bg-gradient-accent rounded-full py-3 font-body font-semibold text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-magenta focus-visible:outline-offset-2 disabled:opacity-60"
      >
        ${t('login.submit')}
      </button>
    </form>
  `;

  const formulario = container.querySelector('form');
  const campoEmail = formulario.querySelector('input[name="email"]');
  const campoPassword = formulario.querySelector('input[name="password"]');
  const parrafoError = formulario.querySelector('.login-error');
  const botonEntrar = formulario.querySelector('button[type="submit"]');

  const mostrarError = (mensaje) => {
    parrafoError.textContent = mensaje;
    parrafoError.classList.remove('hidden');
  };

  const ocultarError = () => {
    parrafoError.classList.add('hidden');
  };

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    ocultarError();
    botonEntrar.disabled = true;
    botonEntrar.textContent = t('login.submitting');

    try {
      const user = await login(campoEmail.value, campoPassword.value);
      onSuccess?.(user);
    } catch (error) {
      mostrarError(mensajeError(error));
    } finally {
      botonEntrar.disabled = false;
      botonEntrar.textContent = t('login.submit');
    }
  });
};

export const renderLoginScreen = (container, { onSuccess } = {}) => {
  container.innerHTML = `
    <main class="min-h-screen flex flex-col items-center justify-center px-4">
      <img src="/wc26-analytics-logo.svg" alt="WC26 Analytics" class="h-56 w-auto -mt-16 -mb-8" />
      <div id="login-form-slot" class="flex justify-center w-full"></div>
    </main>
  `;

  const slot = container.querySelector('#login-form-slot');
  renderLoginForm(slot, {
    onSuccess,
    subtitle: t('login.subtitle'),
  });
};
