import type { DepositMethod } from '@/types/database';

const DRAFT_PREFIX = 'upcycle:setor-draft:';
const LAST_WA_PREFIX = 'upcycle:last-wa:';
const DRAFT_VERSION = 1;
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface DepositDraft {
  version: number;
  savedAt: string;
  bsuId: string;
  metode: DepositMethod;
  wasteTypeId: string;
  berat: string;
  nomorWa: string;
  alamat: string;
  lokasiUrl: string;
  lat: number | null;
  lng: number | null;
  catatan: string;
}

function storageKey(prefix: string, userId: string) {
  return `${prefix}${userId}`;
}

function safeGet(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Penyimpanan penuh atau diblokir: abaikan, form tetap berjalan.
  }
}

function safeRemove(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // abaikan
  }
}

export function readDepositDraft(userId: string): DepositDraft | null {
  if (!userId) return null;
  const raw = safeGet(storageKey(DRAFT_PREFIX, userId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<DepositDraft>;
    if (parsed.version !== DRAFT_VERSION || !parsed.savedAt) return null;
    if (Date.now() - new Date(parsed.savedAt).getTime() > DRAFT_TTL_MS) {
      safeRemove(storageKey(DRAFT_PREFIX, userId));
      return null;
    }

    return {
      version: DRAFT_VERSION,
      savedAt: parsed.savedAt,
      bsuId: typeof parsed.bsuId === 'string' ? parsed.bsuId : '',
      metode: parsed.metode === 'antar' ? 'antar' : 'jemput',
      wasteTypeId:
        typeof parsed.wasteTypeId === 'string' ? parsed.wasteTypeId : '',
      berat: typeof parsed.berat === 'string' ? parsed.berat : '',
      nomorWa: typeof parsed.nomorWa === 'string' ? parsed.nomorWa : '',
      alamat: typeof parsed.alamat === 'string' ? parsed.alamat : '',
      lokasiUrl: typeof parsed.lokasiUrl === 'string' ? parsed.lokasiUrl : '',
      lat: typeof parsed.lat === 'number' ? parsed.lat : null,
      lng: typeof parsed.lng === 'number' ? parsed.lng : null,
      catatan: typeof parsed.catatan === 'string' ? parsed.catatan : '',
    };
  } catch {
    return null;
  }
}

export function saveDepositDraft(
  userId: string,
  draft: Omit<DepositDraft, 'version' | 'savedAt'>,
) {
  if (!userId) return;
  safeSet(
    storageKey(DRAFT_PREFIX, userId),
    JSON.stringify({
      ...draft,
      version: DRAFT_VERSION,
      savedAt: new Date().toISOString(),
    }),
  );
}

export function clearDepositDraft(userId: string) {
  if (!userId) return;
  safeRemove(storageKey(DRAFT_PREFIX, userId));
}

export function readLastWhatsApp(userId: string) {
  if (!userId) return '';
  return safeGet(storageKey(LAST_WA_PREFIX, userId)) ?? '';
}

export function rememberWhatsApp(userId: string, nomorWa: string) {
  if (!userId || !nomorWa) return;
  safeSet(storageKey(LAST_WA_PREFIX, userId), nomorWa);
}
