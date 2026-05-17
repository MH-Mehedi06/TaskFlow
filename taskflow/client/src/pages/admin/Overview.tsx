import { Helmet } from 'react-helmet-async';
import { Users, ShoppingBag, DollarSign, AlertTriangle, BarChart2, TrendingUp, Clock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useGetStatsQuery, useGetRecentActivityQuery } from '../../features/admin/adminApi';
import { StatCardSkeleton, SkeletonLine, SkeletonAvatar } from '../../components/admin/Skeleton';
import { IUser, ITask, IDispute } from '../../types';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmt(n: number) { return n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n); }

const TASK_STATUS_COLORS: Record<string, string> = {
  posted: 'bg-blue-100 text-blue-700',
  assigned: 'bg-indigo-100 text-indigo-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-500',
};

const DISPUTE_STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-100 text-red-700',
  under_review: 'bg-amber-100 text-amber-700',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Overview() {
  const { data: stats, isLoading: statsLoading } = useGetStatsQuery();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivityQuery();

  const taskTotal = stats ? Object.values(stats.tasks).reduce((a, b) => a + b, 0) : 0;

  return (
    <>
      <Helmet><title>Overview | Admin</title></Helmet>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Platform Overview</h2>
          <p className="text-sm text-gray-500 mt-0.5">Real-time health and activity across TaskFlow</p>
        </div>

        {/* Stat cards */}
        {statsLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Users, label: 'Total users', value: fmt(stats.users.total), sub: `+${stats.users.recentSignups} this month`, color: 'bg-primary-50 text-primary-600' },
              { icon: ShoppingBag, label: 'Total tasks', value: fmt(taskTotal), sub: `${stats.tasks.completed ?? 0} completed`, color: 'bg-green-50 text-green-600' },
              { icon: DollarSign, label: 'Platform revenue', value: `$${stats.revenue.total.toFixed(0)}`, sub: 'From captured payments', color: 'bg-emerald-50 text-emerald-600' },
              { icon: AlertTriangle, label: 'Open disputes', value: String(stats.openDisputes), sub: `${stats.pendingReviews} reviews pending`, color: 'bg-red-50 text-red-500' },
            ].map(({ icon: Icon, label, value, sub, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}><Icon className="w-5 h-5" /></div>
                <p className="text-2xl font-extrabold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                <p className="text-xs text-gray-400 mt-1">{sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* Breakdowns row */}
        {stats && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Users className="w-4 h-4" /> User breakdown</h3>
              <div className="space-y-3">
                {[
                  { label: 'Clients', value: stats.users.clients, color: 'bg-blue-500' },
                  { label: 'Taskers', value: stats.users.taskers, color: 'bg-primary-600' },
                  { label: 'Admins', value: stats.users.total - stats.users.clients - stats.users.taskers, color: 'bg-purple-500' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-16">{label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className={`h-2 rounded-full ${color}`} style={{ width: `${stats.users.total ? (value / stats.users.total) * 100 : 0}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-gray-800 w-10 text-right">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><BarChart2 className="w-4 h-4" /> Task status breakdown</h3>
              <div className="space-y-3">
                {Object.entries(stats.tasks).map(([status, count]) => (
                  <div key={status} className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-24 text-center flex-shrink-0 ${TASK_STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {status.replace('_', ' ')}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="h-2 rounded-full bg-primary-500" style={{ width: `${taskTotal ? (count / taskTotal) * 100 : 0}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-gray-800 w-8 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Monthly revenue chart — always shown, real data from DB */}
        {stats && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" /> Monthly Revenue
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Platform fees from captured payments · last 6 months</p>
              </div>
              <Link to="/admin/revenue" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                Full report <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {stats.revenue.monthly.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-36 text-gray-400 gap-2">
                <DollarSign className="w-8 h-8 opacity-20" />
                <p className="text-sm">No revenue recorded yet.</p>
                <p className="text-xs">Revenue appears here once payments are captured.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  data={stats.revenue.monthly.map((m) => ({
                    label: `${MONTHS[m._id.month - 1]} '${String(m._id.year).slice(2)}`,
                    revenue: m.revenue,
                    tasks: m.tasks,
                  }))}
                  margin={{ top: 4, right: 4, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}`} />
                  <Tooltip
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                    cursor={{ fill: '#f0f9ff' }}
                  />
                  <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* Recent activity */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Recent signups */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2"><Users className="w-4 h-4 text-primary-500" /> Recent signups</h3>
              <Link to="/admin/users" className="text-xs text-primary-600 hover:underline">View all</Link>
            </div>
            {activityLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <SkeletonAvatar size="w-7 h-7" />
                    <div className="flex-1 space-y-1"><SkeletonLine w="w-2/3" h="h-3" /><SkeletonLine w="w-1/2" h="h-2.5" /></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {(activity?.recentUsers ?? []).map((u: IUser & { createdAt?: string }) => (
                  <div key={u._id} className="flex items-center gap-2.5">
                    {u.avatar ? (
                      <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                        {u.name?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-800 truncate">{u.name}</p>
                      <p className="text-[11px] text-gray-400 capitalize">{u.role} · {u.createdAt ? timeAgo(u.createdAt) : ''}</p>
                    </div>
                  </div>
                ))}
                {!activityLoading && !activity?.recentUsers?.length && (
                  <p className="text-xs text-gray-400 text-center py-4">No signups yet.</p>
                )}
              </div>
            )}
          </div>

          {/* Recent tasks */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-green-500" /> Recent tasks</h3>
              <Link to="/admin/tasks" className="text-xs text-primary-600 hover:underline">View all</Link>
            </div>
            {activityLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-1"><SkeletonLine w="w-3/4" h="h-3" /><SkeletonLine w="w-1/2" h="h-2.5" /></div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {(activity?.recentTasks ?? []).map((t: ITask & { createdAt?: string }) => (
                  <div key={t._id} className="min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{t.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${TASK_STATUS_COLORS[t.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {t.status.replace('_',' ')}
                      </span>
                      <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />{t.createdAt ? timeAgo(t.createdAt) : ''}
                      </span>
                    </div>
                  </div>
                ))}
                {!activityLoading && !activity?.recentTasks?.length && (
                  <p className="text-xs text-gray-400 text-center py-4">No tasks yet.</p>
                )}
              </div>
            )}
          </div>

          {/* Open disputes */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" /> Open disputes</h3>
              <Link to="/admin/disputes" className="text-xs text-primary-600 hover:underline">View all</Link>
            </div>
            {activityLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-1"><SkeletonLine w="w-3/4" h="h-3" /><SkeletonLine w="w-1/2" h="h-2.5" /></div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {(activity?.recentDisputes ?? []).map((d: IDispute & { createdAt?: string }) => {
                  const client = d.clientId as unknown as IUser | undefined;
                  return (
                    <div key={d._id} className="min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{d.reason}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${DISPUTE_STATUS_COLORS[d.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {d.status.replace('_',' ')}
                        </span>
                        {client && <span className="text-[11px] text-gray-400 truncate">{client.name}</span>}
                      </div>
                    </div>
                  );
                })}
                {!activityLoading && !activity?.recentDisputes?.length && (
                  <p className="text-xs text-gray-400 text-center py-4">No open disputes.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick action shortcuts */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">Quick actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { to: '/admin/users', label: 'Manage users', icon: Users, color: 'text-primary-600 bg-primary-50' },
              { to: '/admin/disputes', label: 'Resolve disputes', icon: AlertTriangle, color: 'text-red-500 bg-red-50' },
              { to: '/admin/reviews', label: 'Moderate reviews', icon: BarChart2, color: 'text-amber-600 bg-amber-50' },
              { to: '/admin/broadcast', label: 'Send broadcast', icon: TrendingUp, color: 'text-green-600 bg-green-50' },
            ].map(({ to, label, icon: Icon, color }) => (
              <Link key={to} to={to} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all group">
                <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-gray-700">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
