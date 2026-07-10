import { login } from '../api/authApi.js';
import { ApiError } from '../api/httpClient.js';
import { setAuth } from '../state/appState.js';

// Traduce el status HTTP a un mensaje de error para el usuario, sin jerga
// técnica ("token", "JWT", etc. quedan fuera de la UI).
const mensajeError = (error) => {
  if (!(error instanceof ApiError)) {
    return 'No se pudo conectar con el servidor. Verifica tu conexión.';
  }
  if (error.status === 401) {
    return 'Correo o contraseña incorrectos.';
  }
  if (error.status === 429) {
    return 'Demasiados intentos. Espera un momento antes de volver a intentar.';
  }
  if (error.status >= 500) {
    return 'El servidor no está disponible en este momento. Intenta de nuevo.';
  }
  return 'Ocurrió un error inesperado al iniciar sesión.';
};

// renderLoginForm: dibuja SOLO la tarjeta glass (título + inputs + botón).
// Es el componente que se reutiliza tal cual dentro del modal de sesión
// expirada (RF-08) — ese modal solo cambia el contenedor que lo envuelve.
// `alertMessage` (usado por sessionExpiredModal.js) agrega el aviso rojo
// COMO PARTE de esta misma tarjeta (borde superior de acento + texto arriba
// del título) en vez de que el llamador apile una tarjeta glass aparte encima
// — dos superficies glass independientes se veían como un corte/costura entre
// ambas (doble blur/borde/sombra). Con un solo `<form class="glass ...">` no
// hay seam posible: es una única tarjeta de principio a fin.
// onSuccess(user) se invoca después de guardar token/user en appState.
export const renderLoginForm = (container, { onSuccess, subtitle, alertMessage } = {}) => {
  const clasesBorde = alertMessage ? 'border-t-2 border-t-alert' : '';

  container.innerHTML = `
    <form class="glass rounded-3xl p-8 w-full max-w-[380px] flex flex-col gap-5 ${clasesBorde}" novalidate>
      ${alertMessage ? `<p class="body-sm text-alert font-semibold text-center -mb-1">${alertMessage}</p>` : ''}
      <div>
        <h1 class="font-display text-[26px] leading-[30px] font-bold text-white">Iniciar sesión</h1>
        ${subtitle ? `<p class="body-sm text-text-secondary mt-2">${subtitle}</p>` : ''}
      </div>

      <label class="flex flex-col gap-1.5">
        <span class="body-sm text-text-secondary">Correo</span>
        <input
          type="email"
          name="email"
          required
          autocomplete="email"
          placeholder="tu@correo.com"
          class="bg-white/[0.04] border border-white/[0.14] rounded-xl px-4 py-3 text-white placeholder:text-text-secondary/60 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-magenta focus-visible:outline-offset-2 transition"
        />
      </label>

      <label class="flex flex-col gap-1.5">
        <span class="body-sm text-text-secondary">Contraseña</span>
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
        Ingresar
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
    botonEntrar.textContent = 'Ingresando...';

    try {
      const { user, token } = await login(campoEmail.value, campoPassword.value);
      setAuth(token, user);
      onSuccess?.(user);
    } catch (error) {
      mostrarError(mensajeError(error));
    } finally {
      botonEntrar.disabled = false;
      botonEntrar.textContent = 'Ingresar';
    }
  });
};

// renderLoginScreen: pantalla completa de entrada (RF-06) — sin navbar, logo
// de La Ruta del Campeón centrado arriba, tarjeta de login centrada vertical
// y horizontalmente. Es lo que main.js monta cuando no hay token válido.
export const renderLoginScreen = (container, { onSuccess } = {}) => {
  container.innerHTML = `
    <main class="min-h-screen flex flex-col items-center justify-center px-4">
      <img src="/logo.png" alt="La Ruta del Campeón" class="h-56 w-auto -mt-6 -mb-16" />
      <div id="login-form-slot" class="flex justify-center w-full"></div>
    </main>
  `;

  const slot = container.querySelector('#login-form-slot');
  renderLoginForm(slot, {
    onSuccess,
    subtitle: 'Autentícate para consultar el itinerario del Mundial 2026.',
  });
};
