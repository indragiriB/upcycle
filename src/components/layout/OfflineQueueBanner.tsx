import { useEffect, useState } from 'react';
import { CloudUpload, Loader2, WifiOff, X } from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { useOfflineDeposits } from '@/hooks/useOfflineDeposits';

function useOnlineStatus() {
  const [online, setOnline] = useState(
    () => (typeof navigator === 'undefined' ? true : navigator.onLine),
  );

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return online;
}

export function OfflineQueueBanner() {
  const { profile } = useAuth();
  const online = useOnlineStatus();
  const { count, isFlushing, message, flush } = useOfflineDeposits(
    profile?.id,
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (count > 0 || !online) setDismissed(false);
  }, [count, online]);

  if (dismissed) return null;
  if (online && count === 0 && !message) return null;

  return (
    <div className="app-container pt-2">
      <div
        className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-3.5 py-2.5 text-[10px] leading-4 ${
          online
            ? 'border-brand-100 bg-brand-50 text-brand-900'
            : 'border-amber-200 bg-amber-50 text-amber-900'
        }`}
      >
        <p className="flex min-w-0 items-start gap-2">
          {online ? (
            isFlushing ? (
              <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" />
            ) : (
              <CloudUpload className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            )
          ) : (
            <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          <span className="min-w-0">
            {message ??
              (!online
                ? 'Kamu sedang offline. Setoran baru akan disimpan di perangkat dan dikirim otomatis saat koneksi kembali.'
                : `${count} setoran tersimpan offline dan siap dikirim.`)}
          </span>
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          {online && count > 0 && (
            <button
              type="button"
              onClick={() => void flush()}
              disabled={isFlushing}
              className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-brand-800 transition-colors hover:bg-brand-100 disabled:opacity-60"
            >
              {isFlushing ? 'Mengirim…' : 'Kirim sekarang'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Tutup pemberitahuan offline"
            className="flex h-6 w-6 items-center justify-center rounded-full transition-colors hover:bg-black/[0.06]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
