// Saat di-host di GitHub Pages situs proyek dilayani dari subpath (mis.
// /upcycle/), sehingga URL aset dan redirect auth tidak boleh menunjuk ke akar
// domain. Selalu lewat helper ini agar build lokal (BASE_URL = '/') dan Pages
// memakai aturan yang sama.
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL;
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}${path.replace(/^\/+/, '')}`;
}

export function absoluteAppUrl(path = '/'): string {
  return `${window.location.origin}${withBase(path)}`;
}
