import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Mail,
  MapPin,
  Phone,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useUpdateOrganizationDetails } from '@/hooks/useAdmin';
import { ORG_TYPE_LABELS } from '@/lib/roles';
import { mapsUrl } from '@/lib/utils';
import type { OrganizationAdminRecord } from '@/types/database';

export function OrganizationDetailsDialog({
  open,
  onClose,
  organization,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  organization: OrganizationAdminRecord | null;
  onSuccess?: (organization: OrganizationAdminRecord) => void;
}) {
  const mutation = useUpdateOrganizationDetails();

  const [nama, setNama] = useState('');
  const [telepon, setTelepon] = useState('');
  const [email, setEmail] = useState('');
  const [alamat, setAlamat] = useState('');
  const [kota, setKota] = useState('');
  const [provinsi, setProvinsi] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !organization) return;
    setNama(organization.nama);
    setTelepon(organization.telepon ?? '');
    setEmail(organization.email ?? '');
    setAlamat(organization.alamat ?? '');
    setKota(organization.kota ?? '');
    setProvinsi(organization.provinsi ?? '');
    setLat(organization.lat === null ? '' : String(organization.lat));
    setLng(organization.lng === null ? '' : String(organization.lng));
    setError(null);
  }, [open, organization]);

  const handleSubmit = async () => {
    if (!organization) return;
    setError(null);

    if (!nama.trim()) {
      setError('Nama organisasi wajib diisi.');
      return;
    }
    if (email.trim() && !email.includes('@')) {
      setError('Format email belum benar.');
      return;
    }

    const latValue = lat.trim() ? Number(lat.replace(',', '.')) : null;
    const lngValue = lng.trim() ? Number(lng.replace(',', '.')) : null;

    if ((latValue === null) !== (lngValue === null)) {
      setError('Isi lintang dan bujur sekaligus, atau kosongkan keduanya.');
      return;
    }
    if (
      latValue !== null &&
      (!Number.isFinite(latValue) || latValue < -90 || latValue > 90)
    ) {
      setError('Lintang harus berupa angka antara -90 dan 90.');
      return;
    }
    if (
      lngValue !== null &&
      (!Number.isFinite(lngValue) || lngValue < -180 || lngValue > 180)
    ) {
      setError('Bujur harus berupa angka antara -180 dan 180.');
      return;
    }

    try {
      const updated = await mutation.mutateAsync({
        id: organization.id,
        nama,
        telepon,
        email,
        alamat,
        kota,
        provinsi,
        lat: latValue,
        lng: lngValue,
      });
      onSuccess?.(updated);
      onClose();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Data organisasi gagal disimpan.',
      );
    }
  };

  if (!organization) return null;

  const preview = mapsUrl(
    lat.trim() ? Number(lat.replace(',', '.')) : null,
    lng.trim() ? Number(lng.replace(',', '.')) : null,
    [alamat, kota, provinsi].filter(Boolean).join(', '),
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ubah data organisasi"
      description="Perbaiki kontak dan titik lokasi agar warga menghubungi nomor yang benar dan peta menampilkan lokasi tepat."
      size="md"
    >
      <div className="space-y-3.5">
        {error && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-red-100 bg-red-50 px-3.5 py-3 text-[11px] leading-5 text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex items-center gap-2.5 rounded-2xl bg-[#f8faf7] px-3.5 py-3 text-[11px] text-muted">
          <Building2 className="h-4 w-4 shrink-0 text-brand-600" />
          <span>
            Tipe organisasi:{' '}
            <span className="font-semibold text-ink">
              {ORG_TYPE_LABELS[organization.tipe]}
            </span>{' '}
            · tipe tidak dapat diubah dari sini.
          </span>
        </div>

        <Input
          label="Nama organisasi"
          value={nama}
          onChange={(event) => setNama(event.target.value)}
          icon={Building2}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Nomor WhatsApp"
            value={telepon}
            onChange={(event) => setTelepon(event.target.value)}
            placeholder="08xxxxxxxxxx"
            icon={Phone}
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nama@contoh.id"
            icon={Mail}
          />
        </div>

        <Input
          label="Alamat"
          value={alamat}
          onChange={(event) => setAlamat(event.target.value)}
          placeholder="Jalan, nomor, kelurahan"
          icon={MapPin}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Kota"
            value={kota}
            onChange={(event) => setKota(event.target.value)}
          />
          <Input
            label="Provinsi"
            value={provinsi}
            onChange={(event) => setProvinsi(event.target.value)}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Lintang (lat)"
            value={lat}
            onChange={(event) => setLat(event.target.value)}
            placeholder="-6.2615"
            inputMode="decimal"
            hint="Contoh: -6.2615"
          />
          <Input
            label="Bujur (lng)"
            value={lng}
            onChange={(event) => setLng(event.target.value)}
            placeholder="106.8106"
            inputMode="decimal"
            hint="Contoh: 106.8106"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-black/[0.05] px-3.5 py-3 text-[10px] text-muted">
          <span className="flex items-start gap-1.5">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
            Salin koordinat dari Google Maps (klik kanan pada titik lokasi).
          </span>
          {preview && (
            <a
              href={preview}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 font-semibold text-brand-700 hover:text-brand-800"
            >
              Cek titik lokasi
            </a>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-black/[0.06] pt-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Batal
          </Button>
          <Button
            type="button"
            loading={mutation.isPending}
            onClick={() => void handleSubmit()}
          >
            <Save className="h-3.5 w-3.5" />
            Simpan data
          </Button>
        </div>
      </div>
    </Modal>
  );
}
