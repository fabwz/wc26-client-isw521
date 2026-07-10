const DELAYS_MS = [1000, 2000, 4000, 8000];

const espera = (delayMs, onTick) => {
  return new Promise((resolve) => {
    let restanteMs = delayMs;
    onTick?.(Math.ceil(restanteMs / 1000));

    const intervalo = setInterval(() => {
      restanteMs -= 1000;
      if (restanteMs <= 0) {
        clearInterval(intervalo);
        onTick?.(0);
        resolve();
        return;
      }
      onTick?.(Math.ceil(restanteMs / 1000));
    }, 1000);
  });
};

const esRetriable = (error) => error?.status === 429 || error?.status >= 500;

export const fetchWithBackoff = async (requestFn, { onRetry, onTick } = {}) => {
  let intento = 0;

  while (true) {
    try {
      return await requestFn();
    } catch (error) {
      // TEMPORAL: confirma en Console si el error es retriable (ApiError
      // 429/5xx) o si se propaga de inmediato (NetworkError, 401, etc.) —
      // retirar una vez validado en vivo.
      console.debug('[resiliencia] fetchWithBackoff — error recibido', {
        nombre: error.name,
        status: error.status,
        esRetriable: esRetriable(error),
        intento,
      });

      if (!esRetriable(error) || intento >= DELAYS_MS.length) {
        throw error;
      }

      const delayMs = DELAYS_MS[intento];
      intento += 1;
      onRetry?.({ status: error.status, attempt: intento, delayMs });
      await espera(delayMs, onTick);
    }
  }
};
