// devSessionSimulator: SOLO DESARROLLO. La API de prueba (worldcup26.ir) no
// valida el JWT en ningún endpoint /get/* — confirmado con curl mandando sin
// header, con un token random y con un JWT real corrupto/alterado: los 3
// devuelven 200 en /get/teams, /get/games y /get/stadiums por igual. Eso
// significa que el 401 de RF-08 no es alcanzable contra el servidor real, así
// que este módulo lo dispara manualmente para poder demostrar el modal de
// sesión expirada en vivo durante la defensa.
//
// Para quitarlo antes de la entrega final: borra este archivo y la línea
// `mountDevSessionSimulator(manejarSesionExpirada)` en main.js. No toca
// ninguna otra parte del flujo de auth — `trigger401` es la misma función
// que ya usa la app cuando SÍ llega un 401 real.
//
// `import.meta.env.DEV` hace que todo lo de aquí adentro (botón + atajo) se
// elimine del bundle de producción por tree-shaking; no hace falta un flag
// manual aparte.
//
// `container` es opcional: si se pasa (ej. el panel de devToolsPanel.js), el
// botón se inserta ahí con estilo de ítem de lista en vez de flotar solo con
// posición fija. El atajo de teclado (Ctrl+Shift+E) se registra siempre,
// exista o no el panel — devToolsPanel.js no lo reemplaza, solo agrupa el botón.
export const mountDevSessionSimulator = (trigger401, container) => {
  if (!import.meta.env.DEV) return;

  const boton = document.createElement('button');
  boton.type = 'button';
  boton.textContent = 'Simular 401 (dev)';
  boton.title = 'Atajo: Ctrl+Shift+E — API de prueba no valida JWT, ver comentario en este archivo';
  boton.className = container
    ? 'w-full text-left glass rounded-lg px-4 py-2 body-sm text-alert border border-alert/40 ' +
      'hover:bg-alert/10 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-alert focus-visible:outline-offset-2'
    : 'fixed bottom-4 right-4 z-50 glass rounded-full px-4 py-2 body-sm text-alert border border-alert/40 ' +
      'hover:bg-alert/10 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-alert focus-visible:outline-offset-2';
  boton.addEventListener('click', trigger401);
  (container ?? document.body).appendChild(boton);

  document.addEventListener('keydown', (evento) => {
    const esAtajo = evento.ctrlKey && evento.shiftKey && evento.key.toLowerCase() === 'e';
    if (esAtajo) trigger401();
  });
};
