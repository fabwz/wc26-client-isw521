// SOLO DESARROLLO. Fuerza que solo /get/games falle, después de que /get/stadiums ya
// resolvió y las barras de aforo ya se dibujaron (RF-AE-R).
export const mountDevGamesFailureSimulator = (trigger, container) => {
  if (!import.meta.env.DEV) return;

  const boton = document.createElement('button');
  boton.type = 'button';
  boton.textContent = '2.4 Analítica de Estadios — Simular fallo partidos (dev)';
  boton.title = 'Atajo: Ctrl+Shift+A — falla solo /get/games con /get/stadiums ya resuelto; RF-AE-R';
  boton.className = container
    ? 'w-full text-left glass rounded-lg px-4 py-2 body-sm text-signal border border-signal/40 ' +
      'hover:bg-signal/10 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2'
    : 'fixed bottom-76 right-4 z-50 glass rounded-full px-4 py-2 body-sm text-signal border border-signal/40 ' +
      'hover:bg-signal/10 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2';
  boton.addEventListener('click', trigger);
  (container ?? document.body).appendChild(boton);

  document.addEventListener('keydown', (evento) => {
    const esAtajo = evento.ctrlKey && evento.shiftKey && evento.key.toLowerCase() === 'a';
    if (esAtajo) trigger();
  });
};
