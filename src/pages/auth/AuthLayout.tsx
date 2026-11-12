import type { ReactNode } from 'react';
import { MapPin, Recycle, ShoppingBag } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { withBase } from '@/lib/paths';
import { Logo } from '@/components/ui/Logo';

const FEATURES = [
  {
    icon: Recycle,
    title: 'Setor & timbang transparan',
    description: 'Harga acuan, berat final, dan pembayaran tercatat rapi.',
  },
  {
    icon: MapPin,
    title: 'Jaringan BSU & BSI',
    description: 'Temukan mitra terverifikasi di sekitar lokasimu.',
  },
  {
    icon: ShoppingBag,
    title: 'Marketplace daur ulang',
    description: 'Produk kreatif dan barang bekas dari warga serta industri dalam satu tempat.',
  },
];

export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  usePageTitle(title);

  return (
    <div className="min-h-svh bg-canvas p-0 lg:p-4">
      <div className="mx-auto grid min-h-svh max-w-[1440px] overflow-hidden bg-white lg:min-h-[calc(100svh-2rem)] lg:grid-cols-[1.05fr_0.95fr] lg:rounded-[32px] lg:border lg:border-white lg:shadow-card">
        <aside className="relative hidden overflow-hidden bg-[#0e1710] p-10 lg:flex lg:flex-col lg:justify-between xl:p-12">
          <div className="auth-grid absolute inset-0" />
          <div className="auth-orb absolute -right-48 -top-48 h-[520px] w-[520px] rounded-full opacity-65" />
          <div
            aria-hidden="true"
            className="absolute -bottom-40 -left-24 h-[420px] w-[420px] rounded-full border border-white/[0.06]"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-24 -left-10 h-[300px] w-[300px] rounded-full border border-white/[0.08]"
          />

          <div className="relative">
            <div className="inline-flex rounded-2xl bg-white px-4 py-3 shadow-2xl shadow-black/30">
              <img
                src={withBase('upcycle-logo.svg')}
                alt="Upcycle"
                className="h-9 w-auto"
              />
            </div>

            <p className="mt-12 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-400">
              Ekonomi sirkular, dimulai dari sini
            </p>
            <h2 className="mt-3 max-w-[520px] text-[38px] font-extrabold leading-[1.08] tracking-tight text-white xl:text-[46px]">
              Sampah yang tertata,
              <br />
              <span className="text-brand-400">nilai yang bertumbuh.</span>
            </h2>
            <p className="mt-4 max-w-[430px] text-sm leading-6 text-white/50">
              Satu ruang kerja untuk warga, bank sampah, industri, dan admin
              produk daur ulang.
            </p>

            <div className="mt-8 space-y-3.5">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-brand-400">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-[13px] font-semibold text-white">
                        {feature.title}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-5 text-white/40">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative mt-10">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">
                Satu akun, lima peran
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {['Warga', 'BSU', 'BSI', 'Industri'].map((role) => (
                  <span
                    key={role}
                    className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold text-white/65"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
            <p className="mt-4 text-[10px] text-white/25">
              UPCYCLE · Platform bank sampah & commerce daur ulang
            </p>
          </div>
        </aside>

        <section className="flex min-h-svh flex-col bg-white px-5 py-7 sm:px-8 lg:min-h-0 lg:justify-center lg:px-10 xl:px-14">
          <div className="mx-auto w-full max-w-[430px]">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <Logo to="/" imageClassName="h-9" />
              <span className="rounded-full bg-brand-50 px-3 py-1.5 text-[10px] font-bold text-brand-800">
                Ekonomi sirkular
              </span>
            </div>

            <div className="mb-7">
              <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-ink sm:text-[32px]">
                {title}
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
            </div>

            {children}

            <div className="mt-7 border-t border-black/[0.06] pt-5 text-center text-[13px] text-muted">
              {footer}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
