import clsx, { type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatCompactCurrency(value: number) {
  if (Math.abs(value) >= 1_000_000_000) {
    return `Rp${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(value / 1_000_000_000)} M`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `Rp${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(value / 1_000_000)} jt`;
  }
  if (Math.abs(value) >= 1_000) {
    return `Rp${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(value / 1_000)} rb`;
  }
  return formatCurrency(value);
}

export function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits }).format(value || 0);
}

export function formatWeight(value: number) {
  return `${formatNumber(value, 2)} kg`;
}

export function formatDateShort(value: string | Date) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatDateTime(value: string | Date) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function toLocalDateTimeInput(value: string | Date = new Date()) {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function localDateTimeToIso(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function timeAgo(value: string | Date) {
  const date = new Date(value).getTime();
  const seconds = Math.round((date - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat('id-ID', { numeric: 'auto' });

  const intervals: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];

  for (const [unit, secondsInUnit] of intervals) {
    const amount = Math.round(seconds / secondsInUnit);
    if (Math.abs(amount) >= 1) return formatter.format(amount, unit);
  }

  return 'baru saja';
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function normalizeWhatsApp(phone: string | null | undefined) {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
  if (digits.startsWith('8')) digits = `62${digits}`;
  return digits;
}

export function whatsappUrl(phone: string | null | undefined, message?: string) {
  const normalized = normalizeWhatsApp(phone);
  if (!normalized) return null;
  const suffix = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${normalized}${suffix}`;
}

export function mapsUrl(lat: number | null, lng: number | null, address?: string | null) {
  if (lat !== null && lng !== null) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  if (address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }
  return null;
}

export function todayStartIso() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

export function rangeStartIso(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - (days - 1));
  return date.toISOString();
}

export function monthStartIso() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

export function formatMetricValue(value: number, format: 'number' | 'currency' | 'weight') {
  if (format === 'currency') return formatCompactCurrency(value);
  if (format === 'weight') return `${formatNumber(value, value >= 100 ? 0 : 2)} kg`;
  return formatNumber(value);
}

export function startOfDay(dateValue: string | Date) {
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);
  return date;
}

function localDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function buildDailySeries(
  days: number,
  rows: Array<{ date: string; value: number }>,
) {
  const totals = new Map<string, number>();

  for (const row of rows) {
    const date = startOfDay(row.date);
    const key = localDateKey(date);
    totals.set(key, (totals.get(key) ?? 0) + row.value);
  }

  const points = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);
    const key = localDateKey(date);
    points.push({
      date: key,
      label: new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
      }).format(date),
      shortLabel: new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
      }).format(date),
      value: totals.get(key) ?? 0,
    });
  }

  return points;
}
