import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { DollarSign, TrendingUp, ShoppingBag, BarChart2, Loader2, ArrowUpRight } from 'lucide-react';
import { useGetRevenueQuery } from '../../features/admin/adminApi';
import type { RevenueSeries } from '../../features/admin/adminApi';

// ── Constants ─────────────────────────────────────────────────────────────────

const PERIODS = [
  { key: 'weekly',     label: 'Weekly',      desc: 'Last 12 weeks'  },
  { key: 'monthly',    label: 'Monthly',     desc: 'Last 12 months' },
  { key: 'halfYearly', label: 'Half Yearly', desc: 'Last 6 months'  },
  { key: 'yearly',     label: 'Yearly',      desc: 'Last 5 years'   },
] as const;

type Period = typeof PERIODS[number]['key'];

const CHART_TYPES = ['Bar', 'Area'] as const;
type ChartType = typeof CHART_TYPES[number];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const PIE_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtMoney = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000    ? `$${(n / 1_000).toFixed(1)}k`
  : `$${n.toFixed(0)}`;

const fmtLabel = (item: RevenueSeries, period: Period): string => {
  const { year, month, week } = item._id;
  const yr = String(year).slice(2);
  if (period === 'weekly')  return `W${week ?? ''} '${yr}`;
  if (period === 'yearly')  return String(year);
  return `${MONTHS[(month ?? 1) - 1]} '${yr}`;
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        {sub && (
          <p className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-1">
            <ArrowUpRight className="w-3 h-3" /> {sub}
          </p>
        )}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm min-w-[160px]">
      <p className="font-semibold text-gray-800 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-gray-500">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
            {p.name}
          </span>
          <span className="font-semibold text-gray-800">{fmtMoney(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const CustomPieTooltip = ({ active, payload }: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { percent?: number } }[];
}) => {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-800">{p.name}</p>
      <p className="text-gray-600 mt-0.5">{fmtMoney(p.value)}</p>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Revenue() {
  const [period, setPeriod] = useState<Period>('monthly');
  const [chartType, setChartType] = useState<ChartType>('Bar');

  const { data, isLoading, isFetching } = useGetRevenueQuery({ period });

  const chartData = (data?.series ?? []).map((item) => ({
    name: fmtLabel(item, period),
    Revenue: parseFloat(item.revenue.toFixed(2)),
    'Tasker Earnings': parseFloat(item.earnings.toFixed(2)),
    'Task Value': parseFloat(item.taskValue.toFixed(2)),
    Transactions: item.transactions,
  }));

  const pieData = [
    { name: 'Platform Revenue', value: data?.summary.periodRevenue ?? 0 },
    { name: 'Tasker Earnings',  value: data?.summary.periodEarnings ?? 0 },
  ];

  const categoryPieData = (data?.categoryBreakdown ?? []).map((c) => ({
    name: c.name,
    value: parseFloat(c.revenue.toFixed(2)),
  }));

  const loading = isLoading || isFetching;

  return (
    <>
      <Helmet><title>Revenue | Admin</title></Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Revenue Analytics</h2>
            <p className="text-sm text-gray-500 mt-0.5">Platform earnings overview with period-by-period breakdown</p>
          </div>

          {/* Period tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  period === p.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={DollarSign}
                label="Total platform revenue (all time)"
                value={fmtMoney(data?.summary.totalRevenue ?? 0)}
                color="bg-emerald-50 text-emerald-600"
              />
              <StatCard
                icon={TrendingUp}
                label={`Revenue this ${PERIODS.find(p => p.key === period)?.desc.toLowerCase()}`}
                value={fmtMoney(data?.summary.periodRevenue ?? 0)}
                sub={`Avg ${fmtMoney(data?.summary.avgRevenuePerPeriod ?? 0)} / period`}
                color="bg-blue-50 text-blue-600"
              />
              <StatCard
                icon={ShoppingBag}
                label="Total task value (all time)"
                value={fmtMoney(data?.summary.totalTaskValue ?? 0)}
                color="bg-purple-50 text-purple-600"
              />
              <StatCard
                icon={BarChart2}
                label="Captured transactions (all time)"
                value={String(data?.summary.totalTransactions ?? 0)}
                sub={`${data?.summary.periodTransactions ?? 0} this period`}
                color="bg-amber-50 text-amber-600"
              />
            </div>

            {/* Main chart card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Revenue vs Tasker Earnings
                  <span className="text-xs font-normal text-gray-400 ml-1">
                    ({PERIODS.find(p => p.key === period)?.desc})
                  </span>
                </h3>
                {/* Chart type switcher */}
                <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                  {CHART_TYPES.map((ct) => (
                    <button
                      key={ct}
                      onClick={() => setChartType(ct)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        chartType === ct
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {ct} Chart
                    </button>
                  ))}
                </div>
              </div>

              {chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <BarChart2 className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm">No revenue data for this period</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  {chartType === 'Bar' ? (
                    <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(v) => fmtMoney(v)} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={60} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      <Bar dataKey="Tasker Earnings" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      <Bar dataKey="Task Value" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  ) : (
                    <AreaChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradEarnings" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradTaskValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(v) => fmtMoney(v)} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={60} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                      <Area type="monotone" dataKey="Task Value" stroke="#8b5cf6" strokeWidth={2} fill="url(#gradTaskValue)" dot={false} />
                      <Area type="monotone" dataKey="Tasker Earnings" stroke="#3b82f6" strokeWidth={2} fill="url(#gradEarnings)" dot={false} />
                      <Area type="monotone" dataKey="Revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#gradRevenue)" dot={false} />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>

            {/* Bottom row: two pie charts */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Revenue split pie */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-1">Revenue Split</h3>
                <p className="text-xs text-gray-400 mb-4">
                  Platform revenue vs tasker earnings — {PERIODS.find(p => p.key === period)?.desc.toLowerCase()}
                </p>
                {pieData.every(d => d.value === 0) ? (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                    <p className="text-sm">No data for this period</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={['#10b981', '#3b82f6'][i]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex gap-6 mt-2">
                      {pieData.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-2 text-sm">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ['#10b981', '#3b82f6'][i] }} />
                          <span className="text-gray-500">{d.name}</span>
                          <span className="font-semibold text-gray-800">{fmtMoney(d.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Category revenue pie */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-1">Revenue by Category</h3>
                <p className="text-xs text-gray-400 mb-4">Top 6 categories — {PERIODS.find(p => p.key === period)?.desc.toLowerCase()}</p>
                {categoryPieData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                    <p className="text-sm">No category data for this period</p>
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={categoryPieData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {categoryPieData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-3 space-y-1.5">
                      {categoryPieData.map((d, i) => {
                        const total = categoryPieData.reduce((s, x) => s + x.value, 0);
                        return (
                          <div key={d.name} className="flex items-center gap-2 text-xs">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="text-gray-600 flex-1 truncate">{d.name}</span>
                            <span className="font-medium text-gray-800">{fmtMoney(d.value)}</span>
                            <span className="text-gray-400 w-8 text-right">{total > 0 ? ((d.value / total) * 100).toFixed(0) : 0}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Transactions bar chart */}
            {chartData.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-amber-500" />
                  Transactions per Period
                  <span className="text-xs font-normal text-gray-400 ml-1">({PERIODS.find(p => p.key === period)?.desc})</span>
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip
                      formatter={(v: number) => [v, 'Transactions']}
                      contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                    />
                    <Bar dataKey="Transactions" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
