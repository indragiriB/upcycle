import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  ShieldCheck,
  UserCog,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useAdminOrganizations, useUpdateUserAccess } from '@/hooks/useAdmin';
import { ORG_TYPE_LABELS, ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/lib/roles';
import { VERIFICATION_LABELS } from '@/lib/status';
import type {
  AdminProfileRecord,
  AppRole,
  OrganizationType,
} from '@/types/database';

const ROLE_OPTIONS: AppRole[] = ['warga', 'bsu', 'bsi', 'industri', 'admin'];

const ROLE_ORG_TYPE: Partial<Record<AppRole, OrganizationType>> = {
  bsu: 'bsu',
  bsi: 'bsi',
  industri: 'industri',
};

export function UserAccessDialog({
  open,
  onClose,
  user,
  currentUserId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  user: AdminProfileRecord | null;
  currentUserId: string | null;
  onSuccess?: (user: AdminProfileRecord) => void;
}) {
  const [role, setRole] = useState<AppRole>('warga');
  const [orgId, setOrgId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const organizationsQuery = useAdminOrganizations();
  const mutation = useUpdateUserAccess();

  const requiredOrgType = ROLE_ORG_TYPE[role];
  const isSelf = Boolean(user && currentUserId === user.id);

  useEffect(() => {
    if (!open || !user) return;
    setRole(user.role);
    setOrgId(user.org_id ?? '');
    setError(null);
  }, [open, user]);

  const organizations = useMemo(() => {
    const rows = organizationsQuery.data ?? [];
    if (!requiredOrgType) return [];
    return rows.filter((organization) => organization.tipe === requiredOrgType);
  }, [organizationsQuery.data, requiredOrgType]);

  // Saat peran berubah, organisasi yang tidak lagi cocok harus dilepas.
  useEffect(() => {
    if (!requiredOrgType) {
      setOrgId('');
      return;
    }
    if (orgId && !organizations.some((organization) => organization.id === orgId)) {
      setOrgId('');
    }
  }, [organizations, orgId, requiredOrgType]);

  const handleSubmit = async () => {
    if (!user) return;
    setError(null);

    if (requiredOrgType && !orgId) {
      setError(
        `Peran ${ROLE_LABELS[role]} wajib terhubung ke ${ORG_TYPE_LABELS[requiredOrgType]}.`,
      );
      return;
    }

    try {
      const updated = await mutation.mutateAsync({
        id: user.id,
        role,
        orgId: requiredOrgType ? orgId : null,
      });
      onSuccess?.(updated);
      onClose();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Peran pengguna gagal diperbarui.',
      );
    }
  };

  if (!user) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Atur peran pengguna"
      description="Peran menentukan halaman yang bisa diakses. Perubahan langsung berlaku saat pengguna memuat ulang aplikasi."
      size="sm"
    >
      <div className="space-y-4">
        {error && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-red-100 bg-red-50 px-3.5 py-3 text-[11px] leading-5 text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {isSelf && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-100 bg-amber-50 px-3.5 py-3 text-[11px] leading-5 text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Ini akun Anda sendiri. Peran akun sendiri tidak dapat diubah agar
            akses admin tidak hilang.
          </div>
        )}

        <div className="rounded-2xl bg-[#f8faf7] p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <UserCog className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink">{user.nama}</p>
              <p className="mt-0.5 text-[10px] text-muted">
                Peran saat ini: {ROLE_LABELS[user.role]}
                {user.organizations
                  ? ` · ${user.organizations.nama}`
                  : ' · tanpa organisasi'}
              </p>
            </div>
          </div>
        </div>

        <Select
          label="Peran"
          value={role}
          disabled={isSelf || mutation.isPending}
          onChange={(event) => setRole(event.target.value as AppRole)}
          hint={ROLE_DESCRIPTIONS[role]}
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {ROLE_LABELS[option]}
            </option>
          ))}
        </Select>

        {requiredOrgType ? (
          <Select
            label={ORG_TYPE_LABELS[requiredOrgType]}
            value={orgId}
            disabled={isSelf || mutation.isPending}
            onChange={(event) => setOrgId(event.target.value)}
            icon={Building2}
            hint="Peran ini wajib terhubung ke organisasi dengan tipe yang sama."
          >
            <option value="">Pilih organisasi</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.nama}
                {organization.status !== 'verified'
                  ? ` (${VERIFICATION_LABELS[organization.status]})`
                  : ''}
              </option>
            ))}
          </Select>
        ) : (
          <p className="flex items-start gap-2 rounded-2xl bg-[#f8faf7] px-3.5 py-3 text-[11px] leading-5 text-muted">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
            Peran {ROLE_LABELS[role]} tidak terhubung ke organisasi usaha.
          </p>
        )}

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
            disabled={isSelf}
            onClick={() => void handleSubmit()}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Simpan peran
          </Button>
        </div>
      </div>
    </Modal>
  );
}
