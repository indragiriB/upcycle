import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Camera,
  ImagePlus,
  Info,
  MapPin,
  Navigation,
  Phone,
  Recycle,
  Scale,
  Store,
  Tag,
  Trash2,
  Truck,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useVerifiedBsuOrganizations } from '@/hooks/useOrganizations';
import { useActiveBuyPrices, useWasteTypes } from '@/hooks/usePrices';
import { useCreateDeposit } from '@/hooks/useDeposits';
import {
  removeDepositPhoto,
  uploadDepositPhoto,
  validateDepositPhoto,
} from '@/lib/deposit-storage';
import {
  clearDepositDraft,
  readDepositDraft,
  readLastWhatsApp,
  rememberWhatsApp,
  saveDepositDraft,
} from '@/lib/deposit-draft';
import { isValidWhatsApp, normalizedWhatsApp } from '@/lib/deposits';
import { compressImageToDataUrl } from '@/lib/images';
import {
  enqueueOfflineDeposit,
  isOfflineError,
} from '@/lib/offline-deposits';
import {
  formatCurrency,
  formatNumber,
  mapsUrl,
  toNumber,
} from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { SetorTabs } from '@/components/deposits/SetorTabs';
import type { DepositMethod } from '@/types/database';

export function DepositFormPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const appliedQuery = useRef(false);

  const bsuQuery = useVerifiedBsuOrganizations();
  const wasteTypesQuery = useWasteTypes();
  const pricesQuery = useActiveBuyPrices();
  const createDeposit = useCreateDeposit();

  const [draft] = useState(() =>
    profile ? readDepositDraft(profile.id) : null,
  );
  const [restoredDraft, setRestoredDraft] = useState(
    Boolean(
      draft &&
        (draft.wasteTypeId ||
          draft.berat ||
          draft.alamat ||
          draft.lokasiUrl ||
          draft.catatan),
    ),
  );
  const [bsuId, setBsuId] = useState(draft?.bsuId ?? '');
  const [metode, setMetode] = useState<DepositMethod>(
    draft?.metode ?? 'jemput',
  );
  const [wasteTypeId, setWasteTypeId] = useState(draft?.wasteTypeId ?? '');
  const [berat, setBerat] = useState(draft?.berat ?? '');
  const [nomorWa, setNomorWa] = useState(
    draft?.nomorWa || (profile ? readLastWhatsApp(profile.id) : ''),
  );
  const [alamat, setAlamat] = useState(draft?.alamat ?? '');
  const [lokasiUrl, setLokasiUrl] = useState(draft?.lokasiUrl ?? '');
  const [lat, setLat] = useState<number | null>(draft?.lat ?? null);
  const [lng, setLng] = useState<number | null>(draft?.lng ?? null);
  const [catatan, setCatatan] = useState(draft?.catatan ?? '');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  usePageTitle('Setor sampah');

  const bsuOptions = bsuQuery.data ?? [];
  const wasteTypes = wasteTypesQuery.data ?? [];
  const prices = pricesQuery.data ?? [];

  useEffect(() => {
    if (!bsuId && bsuOptions.length > 0) {
      setBsuId(bsuOptions[0].id);
    }
  }, [bsuId, bsuOptions]);

  // Jenis/BSU yang dipilih dari halaman harga ikut terbawa ke form.
  useEffect(() => {
    if (appliedQuery.current) return;
    if (bsuQuery.isLoading || wasteTypesQuery.isLoading) return;
    appliedQuery.current = true;

    const jenis = searchParams.get('jenis');
    if (jenis && wasteTypes.some((waste) => waste.id === jenis)) {
      setWasteTypeId(jenis);
    }
    const bsu = searchParams.get('bsu');
    if (bsu && bsuOptions.some((option) => option.id === bsu)) {
      setBsuId(bsu);
    }
  }, [
    bsuOptions,
    bsuQuery.isLoading,
    searchParams,
    wasteTypes,
    wasteTypesQuery.isLoading,
  ]);

  // Simpan draft agar isian tidak hilang saat halaman ter-refresh di HP.
  useEffect(() => {
    if (!profile) return;
    const timeout = window.setTimeout(() => {
      saveDepositDraft(profile.id, {
        bsuId,
        metode,
        wasteTypeId,
        berat,
        nomorWa,
        alamat,
        lokasiUrl,
        lat,
        lng,
        catatan,
      });
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [
    profile,
    bsuId,
    metode,
    wasteTypeId,
    berat,
    nomorWa,
    alamat,
    lokasiUrl,
    lat,
    lng,
    catatan,
  ]);


  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const selectedBsu = bsuOptions.find((item) => item.id === bsuId) ?? null;
  const selectedWaste = wasteTypes.find((item) => item.id === wasteTypeId) ?? null;
  const selectedBsuPrices = useMemo(
    () => prices.filter((price) => price.org_id === bsuId),
    [prices, bsuId],
  );
  const selectedPrice = useMemo(
    () =>
      selectedBsuPrices.find(
        (price) => price.waste_type_id === wasteTypeId,
      ) ?? null,
    [selectedBsuPrices, wasteTypeId],
  );
  const estimatedValue = selectedPrice
    ? Math.round((Number(berat) || 0) * toNumber(selectedPrice.harga_per_kg))
    : 0;

  if (!profile) return null;

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const validation = validateDepositPhoto(file);
    if (validation) {
      setError(validation);
      return;
    }

    setError(null);
    setPhoto(file);
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage('Perangkat tidak mendukung pengambilan lokasi.');
      return;
    }

    setGettingLocation(true);
    setLocationMessage(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(Number(position.coords.latitude.toFixed(7)));
        setLng(Number(position.coords.longitude.toFixed(7)));
        setGettingLocation(false);
        setLocationMessage('Koordinat lokasi berhasil diambil.');
      },
      () => {
        setGettingLocation(false);
        setLocationMessage(
          'Lokasi tidak bisa diambil. Tempel tautan Google Maps atau izinkan akses lokasi.',
        );
      },
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  };

  const handleResetDraft = () => {
    if (profile) clearDepositDraft(profile.id);
    setBsuId(bsuOptions[0]?.id ?? '');
    setMetode('jemput');
    setWasteTypeId('');
    setBerat('');
    setNomorWa(profile ? readLastWhatsApp(profile.id) : '');
    setAlamat('');
    setLokasiUrl('');
    setLat(null);
    setLng(null);
    setCatatan('');
    setPhoto(null);
    setLocationMessage(null);
    setError(null);
    setRestoredDraft(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!bsuId) {
      setError('Pilih BSU tujuan terlebih dahulu.');
      return;
    }
    if (!selectedWaste) {
      setError('Pilih jenis sampah.');
      return;
    }
    const weight = Number(berat);
    if (!Number.isFinite(weight) || weight <= 0) {
      setError('Perkiraan berat harus lebih dari 0 kg.');
      return;
    }
    if (!isValidWhatsApp(nomorWa)) {
      setError('Nomor WhatsApp tidak valid. Gunakan format 08xx atau 62xx.');
      return;
    }
    if (metode === 'jemput') {
      if (!alamat.trim()) {
        setError('Alamat penjemputan wajib diisi untuk metode jemput.');
        return;
      }
      if (!lokasiUrl.trim() && (lat === null || lng === null)) {
        setError(
          'Untuk penjemputan, isi tautan Google Maps atau ambil lokasi saat ini.',
        );
        return;
      }
    }
    if (photo) {
      const validation = validateDepositPhoto(photo);
      if (validation) {
        setError(validation);
        return;
      }
    }

    setSubmitting(true);
    const depositId = crypto.randomUUID();
    let uploadedPath: string | null = null;

    const queueForLater = async (reason: string) => {
      const photoDataUrl = photo
        ? await compressImageToDataUrl(photo, { maxBytes: 380 * 1024 })
        : null;

      await enqueueOfflineDeposit({
        id: depositId,
        userId: profile.id,
        bsuId,
        metode,
        nomorWa: normalizedWhatsApp(nomorWa),
        lokasiUrl: lokasiUrl.trim() || null,
        lat,
        lng,
        alamat: alamat.trim() || null,
        estimasiJenis: selectedWaste.nama,
        estimasiBeratKg: Number(weight.toFixed(2)),
        catatan: catatan.trim() || null,
        photoDataUrl,
      });

      clearDepositDraft(profile.id);
      rememberWhatsApp(profile.id, normalizedWhatsApp(nomorWa));
      navigate('/warga/riwayat', {
        replace: true,
        state: { queued: true, reason },
      });
    };

    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        await queueForLater('offline');
        return;
      }

      if (photo) {
        uploadedPath = await uploadDepositPhoto(profile.id, depositId, photo);
      }

      try {
        await createDeposit.mutateAsync({
          id: depositId,
          wargaId: profile.id,
          bsuId,
          metode,
          nomorWa: normalizedWhatsApp(nomorWa),
          lokasiUrl: lokasiUrl.trim() || null,
          lat,
          lng,
          alamat: alamat.trim() || null,
          estimasiJenis: selectedWaste.nama,
          estimasiBeratKg: Number(weight.toFixed(2)),
          catatan: catatan.trim() || null,
          fotoUrl: uploadedPath,
        });
      } catch (failure) {
        if (uploadedPath) {
          try {
            await removeDepositPhoto(uploadedPath);
          } catch {
            // Abaikan kegagalan pembersihan; setoran tetap disimpan offline.
          }
        }
        throw failure;
      }

      navigate(`/warga/setoran/${depositId}`, {
        replace: true,
        state: { created: true },
      });
      clearDepositDraft(profile.id);
      rememberWhatsApp(profile.id, normalizedWhatsApp(nomorWa));
    } catch (failure) {
      if (isOfflineError(failure)) {
        try {
          await queueForLater('network');
          return;
        } catch (queueFailure) {
          setError(
            queueFailure instanceof Error
              ? queueFailure.message
              : 'Setoran offline gagal disimpan. Coba lagi.',
          );
          return;
        }
      }

      setError(
        failure instanceof Error
          ? failure.message
          : 'Setoran gagal dibuat. Coba lagi.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-4">
      <PageHeader
        eyebrow="Setor sampah"
        title="Buat setoran baru"
        description="Pilih BSU, tentukan metode setor, lalu isi jenis dan perkiraan berat sampahmu."
        backTo="/dashboard"
        backLabel="Kembali ke dashboard"
        actions={
          <Badge tone="green" dot>
            Harga aktif BSU
          </Badge>
        }
      />

      <SetorTabs />

      {restoredDraft && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-[11px] leading-5 text-brand-900">
          <p className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            Draft setoran terakhirmu dipulihkan. Isian tetap tersimpan selama
            kamu berpindah halaman.
          </p>
          <button
            type="button"
            onClick={handleResetDraft}
            className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold text-brand-800 transition-colors hover:bg-brand-100"
          >
            Mulai baru
          </button>
        </div>
      )}

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="grid gap-4 lg:grid-cols-[1.45fr_0.75fr]"
        noValidate
      >
        <div className="space-y-4">
          <Card className="p-4 md:p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Recycle className="h-[18px] w-[18px]" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-ink">Tujuan setoran</h2>
                <p className="text-[11px] text-muted">
                  Pilih BSU dan jenis sampah yang akan disetor.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Select
                label="BSU tujuan"
                value={bsuId}
                onChange={(event) => setBsuId(event.target.value)}
                disabled={bsuQuery.isLoading}
                hint={
                  selectedBsu?.kota
                    ? `${selectedBsu.nama} · ${selectedBsu.kota}`
                    : 'Hanya BSU terverifikasi yang bisa dipilih.'
                }
                required
              >
                <option value="">Pilih BSU</option>
                {bsuOptions.map((bsu) => (
                  <option key={bsu.id} value={bsu.id}>
                    {bsu.nama}
                    {bsu.kota ? ` · ${bsu.kota}` : ''}
                  </option>
                ))}
              </Select>

              <Select
                label="Jenis sampah"
                value={wasteTypeId}
                onChange={(event) => setWasteTypeId(event.target.value)}
                disabled={wasteTypesQuery.isLoading}
                hint={
                  selectedPrice
                    ? `Harga beli ${formatCurrency(
                        toNumber(selectedPrice.harga_per_kg),
                      )}/kg`
                    : 'Harga final ditentukan setelah penimbangan BSU.'
                }
                required
              >
                <option value="">Pilih jenis sampah</option>
                {wasteTypes.map((waste) => (
                  <option key={waste.id} value={waste.id}>
                    {waste.nama}
                    {waste.kategori ? ` · ${waste.kategori}` : ''}
                  </option>
                ))}
              </Select>

              <Input
                label="Perkiraan berat (kg)"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={berat}
                onChange={(event) => setBerat(event.target.value)}
                placeholder="Contoh: 8.5"
                icon={Scale}
                required
              />

              <div className="rounded-2xl border border-brand-100 bg-brand-50/70 px-4 py-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-brand-800/70">
                  Estimasi pembayaran
                </p>
                <p className="mt-1 text-xl font-extrabold tracking-tight text-brand-900">
                  {formatCurrency(estimatedValue)}
                </p>
                <p className="mt-0.5 text-[9px] leading-4 text-brand-800/70">
                  {selectedPrice
                    ? `${formatNumber(Number(berat) || 0, 2)} kg × ${formatCurrency(
                        toNumber(selectedPrice.harga_per_kg),
                      )}`
                    : 'Pilih BSU dan jenis sampah untuk melihat estimasi.'}
                </p>
              </div>
            </div>

            {bsuQuery.isError && (
              <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-[11px] leading-5 text-red-700">
                Daftar BSU gagal dimuat. Muat ulang halaman lalu coba lagi.
              </p>
            )}
          </Card>

          <Card className="p-4 md:p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f2f5f1] text-ink">
                <Truck className="h-[18px] w-[18px]" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-ink">Metode setor</h2>
                <p className="text-[11px] text-muted">
                  Pilih dijemput BSU atau antar sendiri ke lokasi BSU.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {(
                [
                  {
                    value: 'jemput' as DepositMethod,
                    title: 'Dijemput BSU',
                    description:
                      'BSU datang sesuai jadwal yang dikonfirmasi lewat notifikasi.',
                    icon: Truck,
                  },
                  {
                    value: 'antar' as DepositMethod,
                    title: 'Antar sendiri',
                    description:
                      'Datang langsung ke BSU untuk ditimbang dan dibayar.',
                    icon: Store,
                  },
                ]
              ).map((option) => {
                const Icon = option.icon;
                const active = metode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMetode(option.value)}
                    className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors ${
                      active
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-black/[0.06] bg-[#fafbf8] hover:bg-[#f4f7f1]'
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        active
                          ? 'bg-brand-600 text-white'
                          : 'bg-white text-brand-700'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-[12px] font-bold text-ink">
                        {option.title}
                      </span>
                      <span className="mt-0.5 block text-[10px] leading-4 text-muted">
                        {option.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {metode === 'jemput' && (
              <div className="mt-4 space-y-4 rounded-[20px] border border-dashed border-black/10 bg-[#fafbf8] p-3.5">
                <div className="flex items-start gap-2 rounded-xl bg-white px-3 py-2.5 text-[10px] leading-4 text-muted">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
                  BSU membutuhkan alamat dan titik lokasi untuk menjemput
                  sampahmu.
                </div>

                <Textarea
                  label="Alamat penjemputan"
                  value={alamat}
                  onChange={(event) => setAlamat(event.target.value)}
                  placeholder="Contoh: Jl. Melati No. 10, RT 02/RW 05, Jakarta Selatan"
                  hint="Sertakan patokan bila memudahkan petugas menemukan lokasi."
                  required
                />

                <Input
                  label="Tautan Google Maps (opsional jika lokasi diambil)"
                  type="url"
                  value={lokasiUrl}
                  onChange={(event) => setLokasiUrl(event.target.value)}
                  placeholder="https://maps.app.goo.gl/..."
                  icon={MapPin}
                  hint="Buka Google Maps → Bagikan → Salin tautan."
                />

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleUseLocation}
                    loading={gettingLocation}
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    Ambil lokasi saat ini
                  </Button>
                  {lat !== null && lng !== null && (
                    <Badge tone="green" dot>
                      Koordinat siap
                    </Badge>
                  )}
                  {lat !== null && lng !== null && (
                    <a
                      href={mapsUrl(lat, lng) ?? '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-semibold text-brand-700 hover:text-brand-800"
                    >
                      Lihat titik lokasi
                    </a>
                  )}
                </div>

                {locationMessage && (
                  <p className="flex items-start gap-2 rounded-xl bg-white px-3 py-2.5 text-[10px] leading-4 text-muted">
                    <Info className="mt-0.5 h-3 w-3 shrink-0 text-brand-600" />
                    {locationMessage}
                  </p>
                )}
              </div>
            )}
          </Card>

          <Card className="p-4 md:p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Phone className="h-[18px] w-[18px]" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-ink">Kontak & foto</h2>
                <p className="text-[11px] text-muted">
                  BSU memakai nomor ini untuk koordinasi penjemputan.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input
                label="Nomor WhatsApp"
                type="tel"
                inputMode="tel"
                value={nomorWa}
                onChange={(event) => setNomorWa(event.target.value)}
                placeholder="0812xxxxxxx"
                icon={Phone}
                autoComplete="tel"
                hint="Gunakan nomor aktif berformat 08xx atau 62xx."
                required
              />

              <Textarea
                label="Catatan untuk BSU (opsional)"
                value={catatan}
                onChange={(event) => setCatatan(event.target.value)}
                placeholder="Contoh: sampah sudah dipilah, mohon hubungi sebelum datang."
                maxLength={240}
                className="min-h-[84px]"
              />
            </div>

            <div className="mt-4">
              <p className="mb-2 text-[13px] font-semibold text-ink">
                Foto sampah (opsional)
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {photoPreview ? (
                  <div className="relative h-24 w-32 overflow-hidden rounded-2xl border border-black/[0.06]">
                    <img
                      src={photoPreview}
                      alt="Pratinjau foto setoran"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setPhoto(null)}
                      aria-label="Hapus foto"
                      className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-ink/70 text-white backdrop-blur-sm transition-colors hover:bg-ink"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-24 w-32 flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-black/15 bg-[#fafbf8] text-muted transition-colors hover:border-brand-300 hover:bg-brand-50/50 hover:text-brand-800"
                  >
                    <ImagePlus className="h-5 w-5" />
                    <span className="text-[10px] font-semibold">
                      Tambah foto
                    </span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <div className="max-w-[240px] text-[9px] leading-4 text-muted">
                  <p className="inline-flex items-center gap-1 font-semibold text-ink">
                    <Camera className="h-3 w-3 text-brand-600" />
                    JPG, PNG, atau WebP
                  </p>
                  <p className="mt-1">
                    Maksimal 5 MB. Foto hanya dapat dilihat olehmu dan BSU
                    tujuan.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {error && (
            <p className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3.5 text-[11px] leading-5 text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-black/[0.04] bg-white px-4 py-3.5 shadow-card">
            <p className="max-w-sm text-[10px] leading-4 text-muted">
              Setoran baru berstatus <strong>diajukan</strong>. BSU akan
              menjadwalkan penjemputan atau memproses timbangan saat kamu
              datang.
            </p>
            <Button
              type="submit"
              size="md"
              loading={submitting}
              disabled={createDeposit.isPending}
            >
              Kirim setoran
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <aside className="space-y-4">
          <Card className="overflow-hidden">
            <div className="bg-[#101a12] px-4 py-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/45">
                Harga aktif
              </p>
              <p className="mt-1 text-sm font-bold text-white">
                {selectedBsu?.nama ?? 'Pilih BSU'}
              </p>
              <p className="mt-0.5 text-[10px] text-white/45">
                {selectedBsu?.alamat ?? 'Harga beli per kg'}
              </p>
            </div>

            <div className="p-3">
              {selectedBsuPrices.length === 0 ? (
                <p className="rounded-2xl bg-[#f8faf7] px-3.5 py-4 text-[10px] leading-4 text-muted">
                  Harga beli untuk BSU ini belum tersedia. Kamu tetap bisa
                  mengirim setoran; harga akan ditentukan saat penimbangan.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {selectedBsuPrices.map((price) => {
                    const active = price.waste_type_id === wasteTypeId;
                    return (
                      <button
                        key={`${price.org_id}-${price.waste_type_id}`}
                        type="button"
                        onClick={() => setWasteTypeId(price.waste_type_id)}
                        className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition-colors ${
                          active
                            ? 'bg-brand-50 ring-1 ring-brand-200'
                            : 'hover:bg-[#f7f9f6]'
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            aria-hidden="true"
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: price.warna }}
                          />
                          <span className="truncate text-[11px] font-semibold text-ink">
                            {price.waste_nama}
                          </span>
                        </span>
                        <span className="shrink-0 text-[10px] font-bold text-brand-800">
                          {formatCurrency(toNumber(price.harga_per_kg))}
                          <span className="font-medium text-muted">/kg</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[9px] leading-4 text-amber-800">
                <Tag className="mt-0.5 h-3 w-3 shrink-0" />
                Harga dapat berubah. Nilai final mengikuti harga aktif saat BSU
                menimbang.
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Wallet className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[12px] font-bold text-ink">
                  Ringkasan setoran
                </p>
                <p className="text-[10px] text-muted">Sebelum dikirim</p>
              </div>
            </div>

            <dl className="mt-3 space-y-2 text-[11px]">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted">BSU tujuan</dt>
                <dd className="max-w-[150px] text-right font-semibold text-ink">
                  {selectedBsu?.nama ?? '—'}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted">Jenis</dt>
                <dd className="font-semibold text-ink">
                  {selectedWaste?.nama ?? '—'}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted">Perkiraan berat</dt>
                <dd className="font-semibold text-ink">
                  {formatNumber(Number(berat) || 0, 2)} kg
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted">Metode</dt>
                <dd className="font-semibold text-ink">
                  {metode === 'jemput' ? 'Dijemput BSU' : 'Antar sendiri'}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3 border-t border-black/[0.06] pt-2">
                <dt className="font-semibold text-ink">Estimasi nilai</dt>
                <dd className="text-sm font-extrabold text-brand-800">
                  {formatCurrency(estimatedValue)}
                </dd>
              </div>
            </dl>

            <p className="mt-3 rounded-xl bg-[#f8faf7] px-3 py-2.5 text-[9px] leading-4 text-muted">
              Nilai ini hanya perkiraan. Pembayaran final dihitung dari berat
              dan harga saat penimbangan, lalu dikonfirmasi olehmu.
            </p>
          </Card>
        </aside>
      </form>
    </div>
  );
}
