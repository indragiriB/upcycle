import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthProvider';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { queryClient } from '@/lib/query-client';
import { initMonitoring } from '@/lib/monitoring';
import { registerServiceWorker } from '@/lib/pwa';
import App from '@/App';
import '@/index.css';

initMonitoring();
registerServiceWorker();

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Elemen #root tidak ditemukan.');
}

// GitHub Pages melayani aplikasi dari subpath (mis. /upcycle/), jadi router
// harus membuang prefix tersebut agar "/" tetap cocok dengan RootRedirect.
// BASE_URL selalu diakhiri "/" dan bernilai "/" saat build lokal.
const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter basename={routerBasename}>
          <AppErrorBoundary>
            <App />
          </AppErrorBoundary>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
