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
        <p class="field-error hidden body-sm text-alert" role="alert"></p>
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
        <p class="field-error hidden body-sm text-alert" role="alert"></p>
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
  const errorEmail = campoEmail.closest('label').querySelector('.field-error');
  const errorPassword = campoPassword.closest('label').querySelector('.field-error');
  const parrafoError = formulario.querySelector('.login-error');
  const botonEntrar = formulario.querySelector('button[type="submit"]');

  const mostrarError = (mensaje) => {
    parrafoError.textContent = mensaje;
    parrafoError.classList.remove('hidden');
  };

  const ocultarError = () => {
    parrafoError.classList.add('hidden');
  };

  const mostrarErrorCampo = (parrafo, mensaje) => {
    parrafo.textContent = mensaje;
    parrafo.classList.remove('hidden');
  };

  const ocultarErrorCampo = (parrafo) => {
    parrafo.classList.add('hidden');
  };

  // Validación explícita en JS previa al fetch: type="email" ya da una verificación
  // básica del navegador, pero se refuerza aquí para evitar peticiones innecesarias
  // (ver context/requirements.md sección 16, medida 3).
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validarFormulario = () => {
    let esValido = true;

    if (!EMAIL_REGEX.test(campoEmail.value.trim())) {
      mostrarErrorCampo(errorEmail, t('login.validation.emailInvalid'));
      esValido = false;
    } else {
      ocultarErrorCampo(errorEmail);
    }

    if (campoPassword.value.trim() === '') {
      mostrarErrorCampo(errorPassword, t('login.validation.passwordRequired'));
      esValido = false;
    } else {
      ocultarErrorCampo(errorPassword);
    }

    return esValido;
  };

  // Controlador de la petición de login en curso: si el usuario reintenta antes de que la
  // anterior termine (ej. quedó colgada por una conexión bloqueada), se aborta en vez de
  // dejarla viva junto a la nueva — evita acumular peticiones sin cancelar entre reintentos.
  let loginEnCurso = null;

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    ocultarError();

    if (!validarFormulario()) {
      return;
    }

    loginEnCurso?.abort();
    const controlador = new AbortController();
    loginEnCurso = controlador;

    botonEntrar.disabled = true;
    botonEntrar.textContent = t('login.submitting');

    try {
      const user = await login(campoEmail.value, campoPassword.value, { signal: controlador.signal });
      onSuccess?.(user);
    } catch (error) {
      // El intento cancelado no debe pisar el mensaje/estado del reintento que lo reemplazó.
      if (controlador.signal.aborted) return;
      mostrarError(mensajeError(error));
    } finally {
      if (loginEnCurso === controlador) {
        loginEnCurso = null;
        botonEntrar.disabled = false;
        botonEntrar.textContent = t('login.submit');
      }
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
