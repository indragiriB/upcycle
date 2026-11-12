import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages menyajikan situs proyek di /<nama-repo>/, sedangkan situs
// pengguna (<user>.github.io) dan custom domain tetap di akar. Keberadaan
// public/CNAME menandakan situs memakai custom domain.
// VITE_BASE_PATH dapat menimpa hasil deteksi otomatis ini.
function hasCustomDomain(): boolean {
  const file = join(process.cwd(), 'public', 'CNAME');
  return existsSync(file) && readFileSync(file, 'utf8').trim().length > 0;
}

function resolveBase(): string {
  const override = process.env.VITE_BASE_PATH?.trim();
  if (override) {
    if (override.startsWith('/')) {
      return override.endsWith('/') ? override : `${override}/`;
    }
    console.warn(
      `[upcycle] VITE_BASE_PATH "${override}" diabaikan karena tidak diawali "/". ` +
        'Gunakan nilai seperti "/" atau "/nama-repo/".',
    );
  }

  const repo = process.env.GITHUB_REPOSITORY?.split('/')[1];
  if (!process.env.GITHUB_ACTIONS || !repo) return '/';
  if (repo.endsWith('.github.io')) return '/';
  if (hasCustomDomain()) return '/';

  return `/${repo}/`;
}

// GitHub Pages tidak punya rewrite untuk SPA. 404.html hasil salinan
// index.html membuat deep link (mis. /upcycle/marketplace) tetap memuat React
// Router pada URL aslinya. Disalin setelah bundle ditulis karena index.html
// baru ada di akhir proses generate.
function spaFallback(): Plugin {
  return {
    name: 'upcycle:spa-404-fallback',
    apply: 'build',
    writeBundle(options) {
      const dir = options.dir;
      if (!dir) return;

      const indexFile = join(dir, 'index.html');
      if (!existsSync(indexFile)) return;

      copyFileSync(indexFile, join(dir, '404.html'));
    },
  };
}

export default defineConfig({
  base: resolveBase(),
  plugins: [react(), tailwindcss(), spaFallback()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
});
