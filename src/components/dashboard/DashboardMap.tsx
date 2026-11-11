import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CircleMarker,
  MapContainer,
  Marker,
  TileLayer,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Expand,
  Leaf,
  LocateFixed,
  MapPin,
  MapPinOff,
  MessageCircle,
  Minimize2,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { mapsUrl, whatsappUrl } from '@/lib/utils';
import { haversineKm, formatDistance } from '@/lib/geo';
import { ORG_TYPE_LABELS, ORG_TYPE_SHORT_LABELS } from '@/lib/roles';
import {
  VERIFICATION_LABELS,
  VERIFICATION_TONES,
  statusLabel,
  statusTone,
} from '@/lib/status';
import type { OrganizationSummary } from '@/types/database';
import { useClickOutside } from '@/hooks/useClickOutside';

const TYPE_ICONS: Record<string, LucideIcon> = {
  bsu: Leaf,
  bsi: Building2,
  industri: Package,
};

const PIN_SVGS: Record<string, string> = {
  bsu: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
  bsi: '<path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9v.01"/><path d="M9 12v.01"/><path d="M9 15v.01"/><path d="M9 18v.01"/>',
  industri:
    '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
};

const SORT_OPTIONS = [
  { value: 'terdekat', label: 'Terdekat' },
  { value: 'nama', label: 'Nama A–Z' },
  { value: 'terbaru', label: 'Terbaru' },
] as const;

type SortMode = (typeof SORT_OPTIONS)[number]['value'];

interface FlyTarget {
  lat: number;
  lng: number;
  zoom: number;
  nonce: number;
}

function pinIcon(tipe: string, active: boolean) {
  return L.divIcon({
    className: 'upcycle-map-icon',
    html: `<div class="upcycle-map-pin ${active ? 'upcycle-map-pin--active' : ''}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${
      PIN_SVGS[tipe] ?? PIN_SVGS.bsu
    }</svg></div>`,
    iconSize: [40, 46],
    iconAnchor: [20, 44],
  });
}

export function DashboardMap({
  organizations,
  loading,
  error,
  onRetry,
  center,
}: {
  organizations: OrganizationSummary[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  center: [number, number];
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [sort, setSort] = useState<SortMode>('terdekat');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useClickOutside(searchRef, () => setSearchOpen(false), searchOpen);

  const [centerLat, centerLng] = center;
  const distanceCenter = useMemo<[number, number]>(
    () => userLocation ?? [centerLat, centerLng],
    [centerLat, centerLng, userLocation],
  );

  const initialBounds = useMemo(() => {
    const points = organizations
      .filter(
        (organization) =>
          organization.lat !== null && organization.lng !== null,
      )
      .map(
        (organization) =>
          [organization.lat as number, organization.lng as number] as [
            number,
            number,
          ],
      );
    return points.length > 0 ? L.latLngBounds(points) : null;
  }, [organizations]);

  const sortedOrganizations = useMemo(() => {
    const search = query.trim().toLowerCase();
    const rows = organizations
      .filter((organization) => {
        if (!search) return true;
        return [
          organization.nama,
          organization.kota,
          organization.provinsi,
          organization.alamat,
          ORG_TYPE_LABELS[organization.tipe],
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
      })
      .map((organization) => ({
        ...organization,
        distance:
          organization.lat !== null && organization.lng !== null
            ? haversineKm(
                distanceCenter[0],
                distanceCenter[1],
                organization.lat,
                organization.lng,
              )
            : Number.POSITIVE_INFINITY,
      }));

    rows.sort((a, b) => {
      if (sort === 'nama') return a.nama.localeCompare(b.nama, 'id');
      if (sort === 'terbaru') {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
      return a.distance - b.distance;
    });

    return rows;
  }, [distanceCenter, organizations, query, sort]);

  const selected =
    organizations.find((organization) => organization.id === selectedId) ??
    null;

  const selectedDistance =
    selected && selected.lat !== null && selected.lng !== null
      ? haversineKm(
          distanceCenter[0],
          distanceCenter[1],
          selected.lat,
          selected.lng,
        )
      : null;

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTarget) return;
    map.flyTo([flyTarget.lat, flyTarget.lng], flyTarget.zoom, {
      duration: 0.8,
    });
  }, [flyTarget]);

  useEffect(() => {
    const handleFullscreen = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
      window.setTimeout(() => mapRef.current?.invalidateSize(), 280);
    };
    document.addEventListener('fullscreenchange', handleFullscreen);
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreen);
  }, []);

  const selectOrganization = (organization: OrganizationSummary, fly: boolean) => {
    setSelectedId(organization.id);
    if (
      fly &&
      organization.lat !== null &&
      organization.lng !== null
    ) {
      setFlyTarget({
        lat: organization.lat,
        lng: organization.lng,
        zoom: 15,
        nonce: Date.now(),
      });
    }
  };

  const handlePickSearchResult = (organization: OrganizationSummary) => {
    setQuery('');
    setSearchOpen(false);
    selectOrganization(organization, true);
  };

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setLocateError('Perangkat ini tidak mendukung layanan lokasi.');
      return;
    }

    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation: [number, number] = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        setUserLocation(nextLocation);
        setFlyTarget({
          lat: nextLocation[0],
          lng: nextLocation[1],
          zoom: 14,
          nonce: Date.now(),
        });
        setLocating(false);
      },
      (geoError) => {
        setLocating(false);
        setLocateError(
          geoError.code === geoError.PERMISSION_DENIED
            ? 'Izin lokasi ditolak. Aktifkan izin lokasi di browser untuk memakai fitur ini.'
            : 'Lokasi tidak tersedia saat ini. Coba lagi beberapa saat lagi.',
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await panelRef.current?.requestFullscreen();
      }
      window.setTimeout(() => mapRef.current?.invalidateSize(), 280);
    } catch {
      // Browser dapat menolak fullscreen (mis. kebijakan iframe).
    }
  };

  const zoomIn = () => mapRef.current?.zoomIn();
  const zoomOut = () => mapRef.current?.zoomOut();

  return (
    <div
      id="peta-mitra"
      ref={panelRef}
      className="map-panel relative h-[360px] overflow-hidden rounded-[28px] border border-black/[0.04] bg-[#171b18] shadow-card scroll-mt-24 md:h-[440px]"
    >
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#171b18]">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-float">
            <Spinner className="h-5 w-5 text-brand-600" />
          </div>
          <div className="relative text-center">
            <p className="text-sm font-semibold text-white">
              Memuat peta mitra
            </p>
            <p className="mt-1 text-xs text-white/50">
              Menyiapkan lokasi BSU, BSI, dan industri…
            </p>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#171b18] p-5">
          <div className="flex max-w-sm flex-col items-center gap-3 rounded-[22px] bg-white/95 px-6 py-7 text-center shadow-float">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <MapPinOff className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">
                Peta mitra belum bisa dimuat
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Periksa koneksi Supabase lalu coba muat ulang.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={onRetry}>
              <RefreshCw className="h-3.5 w-3.5" />
              Coba lagi
            </Button>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          <MapContainer
            ref={mapRef}
            center={initialBounds ? undefined : center}
            zoom={initialBounds ? undefined : 12}
            bounds={initialBounds ?? undefined}
            boundsOptions={{ padding: [48, 48], maxZoom: 13 }}
            zoomControl={false}
            scrollWheelZoom
            className="h-full w-full"
          >
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
              attribution='Tiles &copy; <a href="https://www.esri.com/">Esri</a> — Esri, HERE, Garmin, &copy; OpenStreetMap contributors'
              maxZoom={19}
              maxNativeZoom={16}
            />
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
              maxNativeZoom={16}
            />
            {sortedOrganizations.map((organization) => (
              <Marker
                key={organization.id}
                position={[
                  organization.lat as number,
                  organization.lng as number,
                ]}
                icon={pinIcon(organization.tipe, organization.id === selectedId)}
                title={organization.nama}
                eventHandlers={{
                  click: () => selectOrganization(organization, false),
                }}
              />
            ))}
            {userLocation && (
              <CircleMarker
                center={userLocation}
                radius={7}
                pathOptions={{
                  color: '#ffffff',
                  weight: 3,
                  fillColor: '#22c55e',
                  fillOpacity: 1,
                }}
              />
            )}
          </MapContainer>

          <div className="pointer-events-none absolute inset-x-3 top-3 z-[900] flex flex-col gap-2">
            <div className="flex flex-wrap items-start gap-2 pr-12">
              <div
                ref={searchRef}
                className="pointer-events-auto relative min-w-[190px] max-w-[340px] flex-1"
              >
                <div className="flex h-11 items-center gap-2.5 rounded-full border border-black/[0.04] bg-white px-4 shadow-float">
                  <Search className="h-4 w-4 shrink-0 text-muted" />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setSearchOpen(true);
                    }}
                    onFocus={() => setSearchOpen(true)}
                    placeholder="Cari BSU, BSI, atau kota…"
                    aria-label="Cari mitra di peta"
                    className="h-full min-w-0 flex-1 bg-transparent text-xs font-medium text-ink outline-none placeholder:text-muted/80 [&::-webkit-search-cancel-button]:hidden"
                  />
                  {query && (
                    <button
                      type="button"
                      aria-label="Hapus pencarian"
                      onClick={() => {
                        setQuery('');
                        setSearchOpen(true);
                      }}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-black/[0.05] hover:text-ink"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {searchOpen && query.trim() && (
                  <div className="absolute left-0 right-0 top-[calc(100%+8px)] overflow-hidden rounded-[18px] border border-black/[0.06] bg-white shadow-float">
                    {sortedOrganizations.length === 0 ? (
                      <p className="px-4 py-5 text-center text-xs text-muted">
                        Mitra tidak ditemukan. Coba kata kunci lain.
                      </p>
                    ) : (
                      sortedOrganizations.slice(0, 5).map((organization) => {
                        const Icon =
                          TYPE_ICONS[organization.tipe] ?? MapPin;
                        return (
                          <button
                            key={organization.id}
                            type="button"
                            onClick={() =>
                              handlePickSearchResult(organization)
                            }
                            className="flex w-full items-center gap-3 border-b border-black/[0.04] px-3.5 py-2.5 text-left last:border-0 hover:bg-[#fafcf9]"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-semibold text-ink">
                                {organization.nama}
                              </span>
                              <span className="block truncate text-[10px] text-muted">
                                {ORG_TYPE_SHORT_LABELS[organization.tipe]}
                                {organization.kota
                                  ? ` · ${organization.kota}`
                                  : ''}
                              </span>
                            </span>
                            <span className="shrink-0 text-[10px] font-semibold text-brand-700">
                              {Number.isFinite(organization.distance)
                                ? formatDistance(organization.distance)
                                : ''}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              <label className="pointer-events-auto relative flex h-11 shrink-0 items-center gap-2 rounded-full border border-black/[0.04] bg-white pl-3.5 pr-9 text-[11px] font-semibold text-ink shadow-float">
                <SlidersHorizontal className="h-3.5 w-3.5 text-muted" />
                <span className="hidden sm:inline text-muted">Urutkan</span>
                <span className="whitespace-nowrap">
                  {SORT_OPTIONS.find((option) => option.value === sort)?.label}
                </span>
                <ChevronDown className="pointer-events-none absolute right-3.5 h-3.5 w-3.5 text-muted" />
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortMode)}
                  aria-label="Urutkan mitra"
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {locateError && (
              <div className="pointer-events-auto flex max-w-[380px] items-start gap-2 rounded-2xl bg-white/95 px-3.5 py-2.5 text-[11px] leading-4 text-ink shadow-float">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span className="flex-1">{locateError}</span>
                <button
                  type="button"
                  aria-label="Tutup pesan lokasi"
                  onClick={() => setLocateError(null)}
                  className="text-muted hover:text-ink"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            aria-label={isFullscreen ? 'Keluar dari layar penuh' : 'Layar penuh'}
            title={isFullscreen ? 'Keluar dari layar penuh' : 'Layar penuh'}
            className="absolute right-3 top-3 z-[900] flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.04] bg-white text-ink shadow-float transition-colors hover:bg-[#f7f9f6]"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Expand className="h-4 w-4" />
            )}
          </button>

          <div className="absolute bottom-10 right-3 z-[900] hidden flex-col items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={handleLocate}
              disabled={locating}
              aria-label="Gunakan lokasi saya"
              title="Gunakan lokasi saya"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.04] bg-white text-ink shadow-float transition-colors hover:bg-[#f7f9f6] disabled:opacity-70"
            >
              {locating ? (
                <Spinner className="h-4 w-4 text-brand-600" />
              ) : (
                <LocateFixed className="h-4 w-4" />
              )}
            </button>
            <div className="flex flex-col overflow-hidden rounded-full border border-black/[0.04] bg-white shadow-float">
              <button
                type="button"
                onClick={zoomIn}
                aria-label="Perbesar peta"
                title="Perbesar"
                className="flex h-10 w-10 items-center justify-center text-ink transition-colors hover:bg-[#f7f9f6]"
              >
                <Plus className="h-4 w-4" />
              </button>
              <span className="mx-2 h-px bg-black/[0.06]" />
              <button
                type="button"
                onClick={zoomOut}
                aria-label="Perkecil peta"
                title="Perkecil"
                className="flex h-10 w-10 items-center justify-center text-ink transition-colors hover:bg-[#f7f9f6]"
              >
                <Minus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!selected && (
            <div className="pointer-events-none absolute bottom-4 left-3 z-[850] inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/95 px-3.5 py-2 text-[10px] font-semibold text-ink shadow-float backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
              </span>
              {organizations.length} mitra di peta
            </div>
          )}

          {selected && (
            <div className="absolute inset-x-3 bottom-3 z-[1000] rounded-[22px] border border-black/[0.05] bg-white/95 p-4 shadow-float backdrop-blur-md sm:left-3 sm:right-auto sm:w-[370px]">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  {(() => {
                    const Icon = TYPE_ICONS[selected.tipe] ?? MapPin;
                    return <Icon className="h-5 w-5" />;
                  })()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {selected.status === 'verified' ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-brand-600" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    )}
                    <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                      {ORG_TYPE_LABELS[selected.tipe]}
                    </p>
                  </div>
                  <p className="mt-0.5 truncate text-sm font-bold text-ink">
                    {selected.nama}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-muted">
                    {selected.alamat ?? selected.kota ?? 'Lokasi mitra'}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {selectedDistance !== null && (
                      <Badge tone="green" className="px-2 py-0.5 text-[9px]">
                        {formatDistance(selectedDistance)}
                      </Badge>
                    )}
                    <Badge
                      tone={statusTone(selected.status, VERIFICATION_TONES)}
                      className="px-2 py-0.5 text-[9px]"
                    >
                      {statusLabel(selected.status, VERIFICATION_LABELS)}
                    </Badge>
                    {selected.kota && (
                      <span className="text-[10px] font-medium text-muted">
                        {selected.kota}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label="Tutup detail mitra"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-black/[0.05] hover:text-ink"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {(() => {
                  const wa = whatsappUrl(
                    selected.telepon,
                    `Halo ${selected.nama}, saya ingin bertanya melalui UPCYCLE.`,
                  );
                  return wa ? (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-brand-600 text-[11px] font-semibold text-white transition-colors hover:bg-brand-700"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp
                    </a>
                  ) : (
                    <span className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-[#f2f5f1] text-[11px] font-semibold text-muted">
                      <MessageCircle className="h-3.5 w-3.5" />
                      Tanpa WA
                    </span>
                  );
                })()}
                {(() => {
                  const route = mapsUrl(
                    selected.lat,
                    selected.lng,
                    selected.alamat,
                  );
                  return route ? (
                    <a
                      href={route}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-black/[0.07] bg-white text-[11px] font-semibold text-ink transition-colors hover:bg-[#f7f9f6]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Lihat rute
                    </a>
                  ) : null;
                })()}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
