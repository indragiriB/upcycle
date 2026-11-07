import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { buildDailySeries, formatMetricValue } from '@/lib/utils';
import type { ChartRange } from '@/types/database';
import type { DashboardChartSource } from '@/hooks/useDashboardData';

const RANGES: Array<{ value: ChartRange; label: string }> = [
  { value: 7, label: '7H' },
  { value: 30, label: '30H' },
  { value: 90, label: '90H' },
];

export function ActivityChartCard({
  source,
  range,
  onRangeChange,
  loading,
}: {
  source: DashboardChartSource | undefined;
  range: ChartRange;
  onRangeChange: (range: ChartRange) => void;
  loading: boolean;
}) {
  const points = useMemo(
    () => (source ? buildDailySeries(range, source.rows) : []),
    [range, source],
  );
  const total = points.reduce((sum, point) => sum + point.value, 0);

  return (
    <Card className="p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <BarChart3 className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-ink">
              {source?.title ?? 'Aktivitas'}
            </h2>
            <p className="mt-0.5 text-[11px] leading-4 text-muted">
              {source?.description ?? 'Ringkasan aktivitas terbaru'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5 rounded-full bg-[#f2f5f1] p-0.5">
          {RANGES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onRangeChange(option.value)}
              aria-pressed={range === option.value}
              className={`rounded-full px-2.5 py-1.5 text-[10px] font-bold transition-colors ${
                range === option.value
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-muted hover:text-ink'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          {loading || !source ? (
            <Skeleton className="h-9 w-36" />
          ) : (
            <p className="text-[30px] font-extrabold leading-none tracking-tight text-ink md:text-[34px]">
              {formatMetricValue(total, source.format)}
            </p>
          )}
          <p className="mt-1.5 text-[11px] font-medium text-muted">
            {range} hari terakhir
          </p>
        </div>
        <Badge tone="green" dot>
          Data langsung
        </Badge>
      </div>

      <div className="mt-4 h-[168px] w-full md:h-[184px]">
        {loading || !source ? (
          <div className="flex h-full items-end gap-2 px-1 pb-6">
            {[42, 62, 48, 78, 58, 88, 64, 74, 50, 68, 44, 72].map(
              (height, index) => (
                <div
                  key={index}
                  className="flex-1 animate-pulse rounded-t-md bg-black/[0.04]"
                  style={{ height: `${height}%` }}
                />
              ),
            )}
          </div>
        ) : total === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="Belum ada aktivitas"
            description="Data akan muncul otomatis setelah ada transaksi pada periode ini."
            compact
            className="h-full justify-center"
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={points}
              margin={{ top: 8, right: 2, left: 2, bottom: 0 }}
            >
              <defs>
                <linearGradient id="upcycleArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4ade80" stopOpacity={0.34} />
                  <stop offset="65%" stopColor="#dcfce7" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke="#edf1eb"
                strokeDasharray="4 4"
              />
              <XAxis
                dataKey="shortLabel"
                tickLine={false}
                axisLine={false}
                minTickGap={28}
                interval="preserveStartEnd"
                dy={6}
              />
              <YAxis hide domain={[0, 'auto']} />
              <Tooltip
                cursor={{ stroke: '#bbf7d0', strokeWidth: 1 }}
                formatter={(value) => [
                  source ? formatMetricValue(Number(value), source.format) : '',
                  'Total',
                ]}
                contentStyle={{
                  borderRadius: 14,
                  border: '1px solid rgba(17,21,17,0.06)',
                  boxShadow: '0 16px 40px -20px rgba(17,21,17,0.28)',
                  fontSize: 12,
                  fontFamily: 'inherit',
                  padding: '8px 12px',
                }}
                labelStyle={{
                  fontSize: 11,
                  color: '#788079',
                  marginBottom: 2,
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#16a34a"
                strokeWidth={2.4}
                fill="url(#upcycleArea)"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: '#16a34a',
                  stroke: '#ffffff',
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
