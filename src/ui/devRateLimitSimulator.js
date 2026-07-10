// devRateLimitSimulator: SOLO DESARROLLO. La caché HTTP de 30s del servidor
// real sirve la URL exacta sin parámetros (la que usa la app) sin pasar por
// el rate limiter, incluso con el límite real ya agotado por otras variantes
// de URL — confirmado con los headers RateLimit-*. Eso hace poco práctico
// ganarle a esa caché para demostrar el countdown de 429 en vivo, así que
// este módulo dispara `simulateRateLimit`/`simulateRateLimitRecovery`
// (worldCupApi.js), que reutilizan el mismo camino real (conBackoffVisible →
// fetchWithBackoff → resilienceBanners) que un 429 real, solo con el origen
// del error simulado. Dos botones/atajos, dos desenlaces distintos:
// - "Simular 429" (Ctrl+Shift+R): agota los 4 reintentos → cae a caché.
// - "Simular 429 (recupera)" (Ctrl+Shift+T): falla 2 veces y el 3er intento
//   "tiene éxito" → el banner desaparece sin pasar por caché.
//
// Para quitarlo antes de la entrega final: borra este archivo, las funciones
// `simulateRateLimit`/`simulateRateLimitRecovery` en worldCupApi.js, y las
// líneas que lo montan en main.js. `import.meta.env.DEV` ya hace que Vite lo
// elimine por tree-shaking del build de producción (igual que los demás
// simuladores dev-only).
// `container` opcional: ver devSessionSimulator.js para el mismo patrón —
// si se pasa (panel de devToolsPanel.js) los botones se insertan ahí con
// estilo de ítem de lista; si no, flotan sueltos como antes. Los atajos de
// teclado (Ctrl+Shift+R / Ctrl+Shift+T) siempre se registran.
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
