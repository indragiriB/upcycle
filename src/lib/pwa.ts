import { withBase } from '@/lib/paths';

let registered = false;

/**
 * Mendaftarkan service worker hanya pada build produksi. Saat pengembangan,
 * service worker lama bisa menyajikan bundle usang sehingga membingungkan.
 */
export function registerServiceWorker() {
  if (registered) return;
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  if (!import.meta.env.PROD) return;

  registered = true;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(withBase('sw.js'), { scope: import.meta.env.BASE_URL })
      .catch(() => {
        // PWA bersifat peningkatan; kegagalan registrasi tidak boleh
        // mengganggu aplikasi.
      });
  });
}
