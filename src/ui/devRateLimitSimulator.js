// SOLO DESARROLLO. `container` opcional: si se pasa, los botones se insertan ahí; si no, flotan sueltos.
export const mountDevRateLimitSimulator = (trigger429Agota, trigger429Recupera, container) => {
  if (!import.meta.env.DEV) return;

  const claseBoton = container
    ? 'w-full text-left glass rounded-lg px-4 py-2 body-sm text-signal border border-signal/40 ' +
      'hover:bg-signal/10 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2'
    : null;

  const botonAgota = document.createElement('button');
  botonAgota.type = 'button';
  botonAgota.textContent = 'Simular 429 (dev)';
  botonAgota.title = 'Atajo: Ctrl+Shift+R — agota reintentos y cae a caché. La caché HTTP del servidor real hace poco fiable el 429 genuino en demo';
  botonAgota.className =
    claseBoton ??
    'fixed bottom-16 right-4 z-50 glass rounded-full px-4 py-2 body-sm text-signal border border-signal/40 ' +
      'hover:bg-signal/10 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2';
  botonAgota.addEventListener('click', trigger429Agota);
  (container ?? document.body).appendChild(botonAgota);

  const botonRecupera = document.createElement('button');
  botonRecupera.type = 'button';
  botonRecupera.textContent = 'Simular 429 (recupera)';
  botonRecupera.title = 'Atajo: Ctrl+Shift+T — falla 2 veces y el 3er intento tiene éxito, sin caer a caché';
  botonRecupera.className =
    claseBoton ??
    'fixed bottom-28 right-4 z-50 glass rounded-full px-4 py-2 body-sm text-signal border border-signal/40 ' +
      'hover:bg-signal/10 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2';
  botonRecupera.addEventListener('click', trigger429Recupera);
  (container ?? document.body).appendChild(botonRecupera);

  document.addEventListener('keydown', (evento) => {
    if (!evento.ctrlKey || !evento.shiftKey) return;
    const tecla = evento.key.toLowerCase();
    if (tecla === 'r') trigger429Agota();
    if (tecla === 't') trigger429Recupera();
  });
};
