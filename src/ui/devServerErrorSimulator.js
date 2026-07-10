// SOLO DESARROLLO. `container` opcional: ver devSessionSimulator.js para el mismo patrón.
export const mountDevServerErrorSimulator = (trigger500, container) => {
  if (!import.meta.env.DEV) return;

  const boton = document.createElement('button');
  boton.type = 'button';
  boton.textContent = 'Simular 500 (dev)';
  boton.title = 'Atajo: Ctrl+Shift+S — la API de prueba no expone un fallo de servidor controlado';
  boton.className = container
    ? 'w-full text-left glass rounded-lg px-4 py-2 body-sm text-signal border border-signal/40 ' +
      'hover:bg-signal/10 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2'
    : 'fixed bottom-40 right-4 z-50 glass rounded-full px-4 py-2 body-sm text-signal border border-signal/40 ' +
      'hover:bg-signal/10 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2';
  boton.addEventListener('click', trigger500);
  (container ?? document.body).appendChild(boton);

  document.addEventListener('keydown', (evento) => {
    const esAtajo = evento.ctrlKey && evento.shiftKey && evento.key.toLowerCase() === 's';
    if (esAtajo) trigger500();
  });
};
