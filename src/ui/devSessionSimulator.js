// SOLO DESARROLLO. La API de prueba no valida el JWT en /get/*, así que el
// 401 de RF-08 no es alcanzable contra el servidor real; este módulo lo dispara manualmente.
// `container` opcional: si se pasa, el botón se inserta ahí en vez de flotar con posición fija.
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
