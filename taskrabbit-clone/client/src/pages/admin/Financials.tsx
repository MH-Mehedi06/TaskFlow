import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { DollarSign, TrendingUp, Star, Loader2, BarChart2, Users } from 'lucide-react';
import { useGetFinancialsQuery } from '../../features/admin/adminApi';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const PAYMENT_COLORS: Record<string, string> = {
  captured: 'bg-green-500',
  held: 'bg-blue-500',
  refunded: 'bg-red-400',
  pending: 'bg-gray-300',
};

function StatCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-extrabold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function Financials() {
  const [period, setPeriod] = useState<'3m' | '6m' | '12m'>('6m');
  const { data, isLoading } = useGetFinancialsQuery({ period });

  const fmtMoney = (n: number) => `$${n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(0)}`;

  return (
    <>
      <Helmet><title>Financials | Admin</title></Helmet>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Financials</h2>
            <p className="text-sm text-gray-500 mt-0.5">Revenue, earnings and payment breakdown</p>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {(['3m', '6m', '12m'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {p === '3m' ? '3 months' : p === '6m' ? '6 months' : '12 months'}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>
        ) : !data ? null : (
          <>
            {/* Summary stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={DollarSign} label="Platform revenue (all time)" value={fmtMoney(data.summary.totalRevenue)} sub="After platform fee" color="bg-emerald-50 text-emerald-600" />
              <StatCard icon={Users} label="Tasker earnings (all time)" value={fmtMoney(data.summary.totalTaskerEarnings)} sub="Paid to taskers" color="bg-primary-50 text-primary-600" />
              <StatCard icon={TrendingUp} label="Total task value (all time)" value={fmtMoney(data.summary.totalTaskValue)} sub="Gross transaction value" color="bg-blue-50 text-blue-600" />
              <StatCard icon={BarChart2} label="Completed payments" value={String(data.summary.capturedTasks)} sub="Captured transactions" color="bg-purple-50 text-purple-600" />
            </div>

            {/* Monthly revenue chart */}
            {data.monthly.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary-600" />
                  Monthly breakdown ({period === '3m' ? 'last 3' : period === '6m' ? 'last 6' : 'last 12'} months)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[500px]">
                    <thead>
                      <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        <th className="text-left pb-3">Month</th>
                        <th className="text-right pb-3">Tasks</th>
                        <th className="text-right pb-3">Task value</th>
                        <th className="text-right pb-3">Tasker earnings</th>
                        <th className="text-right pb-3">Platform revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.monthly.map((m) => (
                        <tr key={`${m._id.year}-${m._id.month}`} className="hover:bg-gray-50">
                          <td className="py-2.5 font-medium text-gray-800">{MONTHS[m._id.month - 1]} {m._id.year}</td>
                          <td className="py-2.5 text-right text-gray-600">{m.count}</td>
                          <td className="py-2.5 text-right text-gray-700">{fmtMoney(m.taskValue)}</td>
                          <td className="py-2.5 text-right text-gray-700">{fmtMoney(m.earnings)}</td>
                          <td className="py-2.5 text-right font-semibold text-emerald-700">{fmtMoney(m.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-gray-200">
                      <tr className="font-semibold text-gray-900">
                        <td className="py-2.5">Total</td>
                        <td className="py-2.5 text-right">{data.monthly.reduce((s, m) => s + m.count, 0)}</td>
                        <td className="py-2.5 text-right">{fmtMoney(data.monthly.reduce((s, m) => s + m.taskValue, 0))}</td>
                        <td className="py-2.5 text-right">{fmtMoney(data.monthly.reduce((s, m) => s + m.earnings, 0))}</td>
                        <td className="py-2.5 text-right text-emerald-700">{fmtMoney(data.monthly.reduce((s, m) => s + m.revenue, 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Bar chart */}
                <div className="mt-6 flex items-end gap-2 h-28">
                  {data.monthly.map((m) => {
                    const maxRev = Math.max(...data.monthly.map((x) => x.revenue), 1);
                    return (
                      <div key={`bar-${m._id.year}-${m._id.month}`} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-emerald-500 rounded-t transition-all" style={{ height: `${Math.max((m.revenue / maxRev) * 100, 3)}%` }} title={fmtMoney(m.revenue)} />
                        <span className="text-[10px] text-gray-400">{MONTHS[m._id.month - 1]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Top categories */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" /> Top categories by revenue
                </h3>
                {data.topCategories.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No data yet</p>
                ) : (
                  <div className="space-y-3">
                    {data.topCategories.map((c, i) => {
                      const maxRev = Math.max(...data.topCategories.map((x) => x.revenue), 1);
                      return (
                        <div key={c._id} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                          {c.icon && <span className="text-base">{c.icon}</span>}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium text-gray-800 truncate">{c.name ?? 'Unknown'}</span>
                              <span className="text-sm font-semibold text-emerald-700 ml-2">{fmtMoney(c.revenue)}</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full">
                              <div className="h-1.5 bg-emerald-500 rounded-full" style={{ width: `${(c.revenue / maxRev) * 100}%` }} />
                            </div>
                            <span className="text-xs text-gray-400">{c.count} tasks</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Top taskers */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary-600" /> Top taskers by earnings
                </h3>
                {data.topTaskers.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No data yet</p>
                ) : (
                  <div className="space-y-3">
                    {data.topTaskers.map((t, i) => {
                      const maxEarnings = Math.max(...data.topTaskers.map((x) => x.earnings), 1);
                      return (
                        <div key={t._id} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                          {t.avatar ? (
                            <img src={t.avatar} alt={t.name} className="w-7 h-7 rounded-full object-cover" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                              {t.name?.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium text-gray-800 truncate">{t.name ?? 'Unknown'}</span>
                              <span className="text-sm font-semibold text-primary-700 ml-2">{fmtMoney(t.earnings)}</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full">
                              <div className="h-1.5 bg-primary-500 rounded-full" style={{ width: `${(t.earnings / maxEarnings) * 100}%` }} />
                            </div>
                            <span className="text-xs text-gray-400">{t.count} tasks</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Payment status breakdown */}
            {data.paymentBreakdown.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4" /> Payment status breakdown
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {data.paymentBreakdown.map((p) => (
                    <div key={p._id} className="bg-gray-50 rounded-xl p-4">
                      <div className={`w-2 h-2 rounded-full ${PAYMENT_COLORS[p._id] ?? 'bg-gray-400'} mb-2`} />
                      <p className="text-lg font-bold text-gray-900">{p.count}</p>
                      <p className="text-xs text-gray-500 capitalize">{p._id}</p>
                      <p className="text-xs font-medium text-gray-600 mt-1">{fmtMoney(p.value ?? 0)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
