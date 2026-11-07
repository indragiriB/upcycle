import { Spinner } from '@/components/ui/Spinner';

export function PageLoader({ label = 'Menyiapkan ruang kerja…' }: { label?: string }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-canvas px-6">
      <div className="flex flex-col items-center gap-5">
        <img src="/upcycle-icon.svg" alt="Upcycle" className="h-14 w-auto" />
        <div className="flex items-center gap-2 rounded-full border border-black/[0.06] bg-white px-4 py-2 text-xs font-medium text-muted shadow-sm">
          <Spinner className="h-3.5 w-3.5 text-brand-600" />
          {label}
        </div>
      </div>
    </div>
  );
}
