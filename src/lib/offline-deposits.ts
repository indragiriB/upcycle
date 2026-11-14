import { dataUrlToFile } from '@/lib/images';
import { supabase } from '@/lib/supabase';
import { uploadDepositPhoto } from '@/lib/deposit-storage';
import type { DepositMethod } from '@/types/database';

const DB_NAME = 'upcycle-offline';
const DB_VERSION = 1;
const STORE_NAME = 'deposit-outbox';
const CHANGE_EVENT = 'upcycle:offline-queue-changed';

export interface OfflineDepositInput {
  id: string;
  userId: string;
  bsuId: string;
  metode: DepositMethod;
  nomorWa: string;
  lokasiUrl: string | null;
  lat: number | null;
  lng: number | null;
  alamat: string | null;
  estimasiJenis: string;
  estimasiBeratKg: number;
  catatan: string | null;
  photoDataUrl: string | null;
}

export interface OfflineDeposit extends OfflineDepositInput {
  createdAt: string;
  attempts: number;
  lastError: string | null;
}

function hasIndexedDb() {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDb()) {
      reject(
        new Error(
          'Penyimpanan offline tidak tersedia di perangkat ini. Coba gunakan browser lain.',
        ),
      );
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, {
          keyPath: 'id',
        });
        store.createIndex('userId', 'userId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        new Error('Penyimpanan offline tidak bisa dibuka. Coba muat ulang.'),
      );
  });
}

async function runTransaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const store = transaction.objectStore(STORE_NAME);
      const request = operation(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error('Operasi penyimpanan gagal.'));
      transaction.onerror = () =>
        reject(transaction.error ?? new Error('Transaksi penyimpanan gagal.'));
    });
  } finally {
    database.close();
  }
}

function notifyQueueChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export const OFFLINE_QUEUE_EVENT = CHANGE_EVENT;

export async function listOfflineDeposits(
  userId?: string,
): Promise<OfflineDeposit[]> {
  const rows = await runTransaction<OfflineDeposit[]>(
    'readonly',
    (store) => store.getAll() as IDBRequest<OfflineDeposit[]>,
  );

  return rows
    .filter((row) => !userId || row.userId === userId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export async function enqueueOfflineDeposit(input: OfflineDepositInput) {
  const item: OfflineDeposit = {
    ...input,
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
  };

  await runTransaction('readwrite', (store) => store.put(item));
  notifyQueueChanged();
  return item;
}

export async function removeOfflineDeposit(id: string) {
  await runTransaction('readwrite', (store) => store.delete(id));
  notifyQueueChanged();
}

async function updateOfflineDeposit(
  id: string,
  patch: Partial<Pick<OfflineDeposit, 'attempts' | 'lastError'>>,
) {
  const existing = await runTransaction<OfflineDeposit | undefined>(
    'readonly',
    (store) => store.get(id) as IDBRequest<OfflineDeposit | undefined>,
  );

  if (!existing) return;

  await runTransaction('readwrite', (store) =>
    store.put({ ...existing, ...patch }),
  );
  notifyQueueChanged();
}

export function isOfflineError(error: unknown) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true;
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error ?? '');

  return /failed to fetch|networkerror|network request failed|load failed|fetch failed|offline|err_internet|timed? ?out/i.test(
    message,
  );
}

export interface FlushResult {
  sent: number;
  failed: number;
  remaining: number;
}

let flushing = false;

/**
 * Mengirim ulang setoran yang tersimpan saat perangkat offline. Foto ikut
 * disimpan sebagai data URL terkompresi sehingga tidak perlu memilih ulang.
 */
export async function flushOfflineDeposits(
  userId: string,
): Promise<FlushResult> {
  if (flushing) {
    const remaining = await listOfflineDeposits(userId);
    return { sent: 0, failed: 0, remaining: remaining.length };
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    const remaining = await listOfflineDeposits(userId);
    return { sent: 0, failed: 0, remaining: remaining.length };
  }

  flushing = true;
  let sent = 0;
  let failed = 0;

  try {
    const items = await listOfflineDeposits(userId);

    for (const item of items) {
      try {
        let photoPath: string | null = null;

        if (item.photoDataUrl) {
          const file = dataUrlToFile(
            item.photoDataUrl,
            `setoran-${item.id}.jpg`,
          );
          photoPath = await uploadDepositPhoto(item.userId, item.id, file);
        }

        const { error } = await supabase.from('deposits').insert({
          id: item.id,
          warga_id: item.userId,
          bsu_id: item.bsuId,
          metode: item.metode,
          nomor_wa: item.nomorWa,
          lokasi_url: item.lokasiUrl,
          lat: item.lat,
          lng: item.lng,
          alamat: item.alamat,
          estimasi_jenis: item.estimasiJenis,
          estimasi_berat_kg: item.estimasiBeratKg,
          catatan: item.catatan,
          foto_url: photoPath,
        });

        if (error) {
          // 23505 = id sudah tersimpan di server (mis. respons sebelumnya
          // hilang di tengah jalan). Anggap berhasil agar tidak terkirim dua kali.
          if (error.code === '23505') {
            await removeOfflineDeposit(item.id);
            sent += 1;
            continue;
          }
          throw error;
        }

        await removeOfflineDeposit(item.id);
        sent += 1;
      } catch (failure) {
        failed += 1;
        const message =
          failure instanceof Error
            ? failure.message
            : 'Setoran offline gagal dikirim.';
        await updateOfflineDeposit(item.id, {
          attempts: item.attempts + 1,
          lastError: message,
        });

        if (isOfflineError(failure)) break;
      }
    }
  } finally {
    flushing = false;
  }

  const remaining = await listOfflineDeposits(userId);
  notifyQueueChanged();
  return { sent, failed, remaining: remaining.length };
}
