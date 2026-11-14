type MonitoringContext = Record<string, unknown>;

interface ErrorPayload {
  message: string;
  stack?: string;
  name: string;
  url: string;
  userAgent: string;
  context: MonitoringContext;
  timestamp: string;
}

const endpoint = import.meta.env.VITE_ERROR_REPORT_URL?.trim() ?? '';
let initialized = false;

function toErrorPayload(
  error: unknown,
  context: MonitoringContext = {},
): ErrorPayload {
  const isError = error instanceof Error;
  return {
    name: isError ? error.name : 'UnknownError',
    message: isError
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Kesalahan tidak diketahui',
    stack: isError ? error.stack : undefined,
    url: typeof window === 'undefined' ? '' : window.location.href,
    userAgent:
      typeof navigator === 'undefined' ? '' : navigator.userAgent,
    context,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Pengawasan error ringan tanpa dependensi. Bila VITE_ERROR_REPORT_URL diisi,
 * laporan dikirim sebagai JSON ke endpoint tersebut. Bila kosong, error tetap
 * dicatat di console agar tidak menambah beban maupun biaya.
 */
export function captureError(error: unknown, context: MonitoringContext = {}) {
  const payload = toErrorPayload(error, context);

  console.error('[upcycle:error]', payload.message, context, error);

  if (!endpoint) return;

  void fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify(payload),
  }).catch(() => {
    // Kegagalan pengiriman laporan tidak boleh mengganggu aplikasi.
  });
}

export function initMonitoring() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  window.addEventListener('error', (event) => {
    captureError(event.error ?? event.message, { source: 'window.error' });
  });

  window.addEventListener('unhandledrejection', (event) => {
    captureError(event.reason, { source: 'unhandledrejection' });
  });
}
