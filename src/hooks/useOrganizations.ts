import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
  OrganizationSummary,
  ProfileWithOrganization,
} from '@/types/database';

export function useOrganizations(profile: ProfileWithOrganization | null) {
  const isAdmin = profile?.role === 'admin';

  return useQuery({
    queryKey: ['organizations', isAdmin ? 'all' : 'verified', profile?.id],
    enabled: Boolean(profile),
    staleTime: 60_000,
    queryFn: async () => {
      let request = supabase
        .from('organizations')
        .select(
          'id, tipe, nama, slug, alamat, kota, provinsi, telepon, lat, lng, logo_url, status, created_at',
        )
        .not('lat', 'is', null)
        .not('lng', 'is', null)
        .order('nama', { ascending: true });

      if (!isAdmin) request = request.eq('status', 'verified');

      const { data, error } = await request;
      if (error) throw error;
      return (data ?? []) as OrganizationSummary[];
    },
  });
}

export function useVerifiedBsuOrganizations() {
  return useQuery({
    queryKey: ['organizations', 'bsu', 'verified'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select(
          'id, tipe, nama, slug, alamat, kota, provinsi, telepon, email, lat, lng, logo_url, status, created_at',
        )
        .eq('tipe', 'bsu')
        .eq('status', 'verified')
        .order('nama', { ascending: true });

      if (error) throw error;
      return (data ?? []) as OrganizationSummary[];
    },
  });
}

export function useVerifiedBsiOrganizations() {
  return useQuery({
    queryKey: ['organizations', 'bsi', 'verified'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select(
          'id, tipe, nama, slug, alamat, kota, provinsi, telepon, email, lat, lng, logo_url, status, created_at',
        )
        .eq('tipe', 'bsi')
        .eq('status', 'verified')
        .order('nama', { ascending: true });

      if (error) throw error;
      return (data ?? []) as OrganizationSummary[];
    },
  });
}

export function useOrganizationById(organizationId: string | null) {
  return useQuery({
    queryKey: ['organization', organizationId],
    enabled: Boolean(organizationId),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select(
          'id, tipe, nama, slug, alamat, kota, provinsi, telepon, email, lat, lng, logo_url, status, created_at',
        )
        .eq('id', organizationId)
        .maybeSingle();

      if (error) throw error;
      return (data as OrganizationSummary | null) ?? null;
    },
  });
}
