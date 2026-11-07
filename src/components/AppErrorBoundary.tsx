import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('UPCYCLE render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-svh items-center justify-center bg-canvas px-5 py-10">
          <div className="w-full max-w-md rounded-[28px] border border-black/[0.04] bg-white p-7 text-center shadow-card sm:p-8">
            <div className="flex justify-center">
              <img
                src="/upcycle-logo.svg"
                alt="Upcycle"
                className="h-9 w-auto"
              />
            </div>
            <span className="mx-auto mt-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <h1 className="mt-3 text-xl font-extrabold tracking-tight text-ink">
              Terjadi kendala saat membuka halaman
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              Muat ulang aplikasi. Jika masalah berlanjut, periksa konfigurasi
              Supabase dan terapkan ulang migrasi terbaru.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand-600 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              <RefreshCw className="h-4 w-4" />
              Muat ulang aplikasi
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
