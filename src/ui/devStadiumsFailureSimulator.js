// devStadiumsFailureSimulator: SOLO DESARROLLO. Botón/atajo para demostrar
// RF-11 (CLAUDE.md 5.5) bajo demanda: fuerza que SOLO `/get/stadiums` falle,
// en un momento posterior a que el itinerario ya esté renderizado con datos
// reales de `/get/games` y `/get/teams` — nunca al cargar la app, porque el
// requisito es específicamente sobre un fallo que ocurre DESPUÉS del render
// inicial. `trigger` (main.js) dispara `simulateStadiumsFailureAfterRender`
// (worldCupApi.js) y, si hay un itinerario en pantalla, aplica la
// actualización parcial por tarjeta (markStadiumsUnavailableForCards,
// itineraryCards.js) — nunca un re-render completo de la lista.
//
// Para quitarlo antes de la entrega final: borra este archivo, la función
// `simulateStadiumsFailureAfterRender` en worldCupApi.js, y las líneas que lo
// montan en main.js. `import.meta.env.DEV` ya hace que Vite lo elimine por
// tree-shaking del build de producción (igual que los demás simuladores).
// `container` opcional: ver devSessionSimulator.js para el mismo patrón.
export const mountDevStadiumsFailureSimulator = (trigger, container) => {
  if (!import.meta.env.DEV) return;

  const boton = document.createElement('button');
  boton.type = 'button';
  boton.textContent = 'Simular fallo estadios (dev)';
  boton.title = 'Atajo: Ctrl+Shift+D — falla solo /get/stadiums tras el render; RF-11';
  boton.className = container
    ? 'w-full text-left glass rounded-lg px-4 py-2 body-sm text-signal border border-signal/40 ' +
      'hover:bg-signal/10 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2'
    : 'fixed bottom-52 right-4 z-50 glass rounded-full px-4 py-2 body-sm text-signal border border-signal/40 ' +
      'hover:bg-signal/10 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2';
  boton.addEventListener('click', trigger);
  (container ?? document.body).appendChild(boton);

  document.addEventListener('keydown', (evento) => {
    const esAtajo = evento.ctrlKey && evento.shiftKey && evento.key.toLowerCase() === 'd';
    if (esAtajo) trigger();
  });
};
