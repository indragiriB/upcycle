import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useUpdateOrganizationStatus } from '@/hooks/useAdmin';
import { ORG_TYPE_LABELS } from '@/lib/roles';
import type { OrganizationAdminRecord } from '@/types/database';

export type OrganizationDecision = 'verify' | 'reject';

export function OrganizationDecisionDialog({
  open,
  onClose,
  organization,
  decision,
  adminId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  organization: OrganizationAdminRecord | null;
  decision: OrganizationDecision;
  adminId: string | null;
  onSuccess?: (
    organization: OrganizationAdminRecord,
    decision: OrganizationDecision,
  ) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const mutation = useUpdateOrganizationStatus(adminId);
  const isVerify = decision === 'verify';

  useEffect(() => {
    if (!open) return;
    setError(null);
  }, [open, organization?.id, decision]);

  const handleSubmit = async () => {
    if (!organization) return;
    setError(null);

    try {
      await mutation.mutateAsync({
        id: organization.id,
        status: isVerify ? 'verified' : 'rejected',
      });
      onSuccess?.(organization, decision);
      onClose();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Status organisasi gagal diperbarui.',
      );
    }
  };

  if (!organization) return null;

  const wasVerified = organization.status === 'verified';
  const Icon = isVerify
    ? BadgeCheck
    : wasVerified
      ? ShieldAlert
      : XCircle;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isVerify ? 'Verifikasi organisasi' : wasVerified ? 'Cabut verifikasi' : 'Tolak organisasi'}
      description={
        isVerify
          ? 'Organisasi terverifikasi dapat bertransaksi penuh di alur setoran, stok, dan marketplace.'
          : 'Organisasi yang ditolak tidak dapat dipilih pada alur transaksi baru.'
      }
      size="sm"
    >
      <div className="space-y-4">
        {error && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-red-100 bg-red-50 px-3.5 py-3 text-[11px] leading-5 text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="rounded-2xl bg-[#f8faf7] p-4">
          <div className="flex items-start gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                isVerify
                  ? 'bg-brand-50 text-brand-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink">
                {organization.nama}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted">
                <Building2 className="h-3 w-3" />
                {ORG_TYPE_LABELS[organization.tipe]} ·{' '}
                {organization.kota ?? 'Kota belum diisi'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2 text-[11px] leading-5 text-muted">
          {isVerify ? (
            <>
              <p className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
                Pastikan nama, alamat, kontak, dan titik lokasi organisasi sudah
                sesuai sebelum menyetujui.
              </p>
              <p className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
                Status akan menjadi terverifikasi dan organisasi dapat tampil di
                pilihan mitra.
              </p>
            </>
          ) : (
            <p className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              {wasVerified
                ? 'Mencabut verifikasi dapat menghentikan alur transaksi baru organisasi ini. Data lama tetap tersimpan.'
                : 'Organisasi akan berstatus ditolak sampai ditinjau dan diverifikasi ulang.'}
            </p>
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
            variant={isVerify ? 'primary' : 'danger'}
            loading={mutation.isPending}
            onClick={() => void handleSubmit()}
          >
            <Icon className="h-3.5 w-3.5" />
            {isVerify
              ? 'Ya, verifikasi'
              : wasVerified
                ? 'Cabut verifikasi'
                : 'Ya, tolak'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
