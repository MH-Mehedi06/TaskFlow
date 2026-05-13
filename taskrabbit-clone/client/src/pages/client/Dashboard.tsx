import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Plus, Loader2, ChevronRight, Calendar, MapPin, Star,
  DollarSign, CheckCircle, Clock, ShieldAlert, MessageSquare, Bell,
} from 'lucide-react';
import { useGetMyTasksQuery, useGetMyTaskStatsQuery } from '../../features/tasks/taskApi';
import { useGetMyDisputesQuery } from '../../features/disputes/disputeApi';
import { useAppSelector } from '../../app/hooks';
import { ITask, IUser, ICategory, IDispute } from '../../types';

type StatusTab = 'all' | 'posted' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'posted', label: 'Posted' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  posted: 'bg-blue-100 text-blue-700',
  assigned: 'bg-indigo-100 text-indigo-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', posted: 'Posted', assigned: 'Assigned',
  in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled',
};

const DISPUTE_STATUS_STYLES: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  under_review: 'bg-amber-100 text-amber-700',
  resolved_refund: 'bg-green-100 text-green-700',
  resolved_release: 'bg-purple-100 text-purple-700',
  closed: 'bg-gray-100 text-gray-600',
};

function TaskCard({ task }: { task: ITask }) {
  const cat = task.categoryId as ICategory;
  const tasker = task.taskerId as IUser | undefined;

  return (
    <Link
      to={`/tasks/${task._id}`}
      className="block bg-white rounded-2xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-2xl flex-shrink-0">{cat?.icon ?? '📋'}</span>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{task.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">{cat?.name}</p>
          </div>
        </div>
        <span className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[task.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {STATUS_LABEL[task.status] ?? task.status}
        </span>
      </div>

      <div className="mt-3 space-y-1.5 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(task.scheduledAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          <span className="truncate">{task.address}</span>
        </div>
        {tasker && (
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-yellow-400" />
            Tasker: <span className="font-medium text-gray-700">{tasker.name}</span>
          </div>
        )}
      </div>

      {task.price && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">Total</span>
          <span className="text-sm font-bold text-gray-900">${task.price.toFixed(2)}</span>
        </div>
      )}

      <div className="mt-2 flex justify-end">
        <span className="text-xs text-primary-600 flex items-center gap-1">
          View details <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Link>
  );
}

export default function ClientDashboard() {
  const { user } = useAppSelector((s) => s.auth);
  const [activeTab, setActiveTab] = useState<StatusTab>('all');
  const [page, setPage] = useState(1);

  const taskParams: Record<string, string | number> = { page, limit: 10 };
  if (activeTab !== 'all') taskParams.status = activeTab;

  const { data, isLoading } = useGetMyTasksQuery(taskParams);
  const { data: stats } = useGetMyTaskStatsQuery();
  const { data: disputes = [] } = useGetMyDisputesQuery();

  const tasks = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const openDisputes = disputes.filter((d: IDispute) => ['open', 'under_review'].includes(d.status));

  const statCards = [
    { icon: Clock, label: 'Active', value: (stats?.assigned ?? 0) + (stats?.in_progress ?? 0) + (stats?.posted ?? 0), color: 'text-blue-600', bg: 'bg-blue-50' },
    { icon: CheckCircle, label: 'Completed', value: stats?.completed ?? 0, color: 'text-green-600', bg: 'bg-green-50' },
    { icon: DollarSign, label: 'Total Spent', value: `$${(stats?.totalSpent ?? 0).toFixed(2)}`, color: 'text-primary-700', bg: 'bg-primary-50' },
    { icon: Calendar, label: 'Upcoming', value: stats?.upcoming ?? 0, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <>
      <Helmet><title>My Dashboard | NeighbourWork</title></Helmet>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome back, {firstName}!</h1>
            <p className="text-gray-500 text-sm mt-1">{stats?.total ?? 0} task{stats?.total !== 1 ? 's' : ''} in your account</p>
          </div>
          <Link
            to="/book"
            className="flex items-center gap-2 bg-primary-700 hover:bg-primary-800 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> New Task
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
              <p className="text-xs text-gray-400 mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main: task list */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto">
              {STATUS_TABS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => { setActiveTab(key); setPage(1); }}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary-700" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-4xl mb-4">📋</p>
                <p className="text-gray-500 mb-4">
                  {activeTab === 'all' ? "You haven't booked any tasks yet." : `No ${STATUS_LABEL[activeTab]?.toLowerCase()} tasks.`}
                </p>
                <Link to="/book" className="inline-flex items-center gap-2 bg-primary-700 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-primary-800 transition-colors">
                  <Plus className="w-4 h-4" /> Book a Tasker
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.map((t) => <TaskCard key={t._id} task={t} />)}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 mt-8">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-40">Prev</button>
                <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-40">Next</button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Profile card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 font-bold text-lg flex items-center justify-center">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-xs text-gray-500 pt-3 border-t border-gray-100">
                <div>
                  <p className="font-bold text-gray-900 text-base">{stats?.total ?? 0}</p>
                  <p>Tasks</p>
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-base">${(stats?.totalSpent ?? 0).toFixed(0)}</p>
                  <p>Spent</p>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-bold text-gray-900 text-sm mb-3">Quick Actions</h3>
              <div className="space-y-1">
                {[
                  { to: '/book', icon: Plus, label: 'Book a new task' },
                  { to: '/chat', icon: MessageSquare, label: 'Messages' },
                  { to: '/notifications', icon: Bell, label: 'Notifications' },
                  { to: '/taskers', icon: Star, label: 'Find Taskers' },
                ].map(({ to, icon: Icon, label }) => (
                  <Link
                    key={to}
                    to={to}
                    className="flex items-center justify-between text-sm text-gray-600 hover:text-primary-700 hover:bg-primary-50 px-2 py-2 rounded-lg transition-colors"
                  >
                    <span className="flex items-center gap-2"><Icon className="w-4 h-4" />{label}</span>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </Link>
                ))}
              </div>
            </div>

            {/* My Disputes */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-500" /> Disputes
                </h3>
                {openDisputes.length > 0 && (
                  <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">
                    {openDisputes.length} open
                  </span>
                )}
              </div>

              {disputes.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No disputes filed</p>
              ) : (
                <div className="space-y-2">
                  {(disputes as IDispute[]).slice(0, 3).map((d) => (
                    <Link
                      key={d._id}
                      to={`/disputes/${d._id}`}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">#{d._id.slice(-6).toUpperCase()}</p>
                        <p className="text-xs text-gray-400 truncate">{d.reason}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${DISPUTE_STATUS_STYLES[d.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {d.status.replace(/_/g, ' ')}
                      </span>
                    </Link>
                  ))}
                  {disputes.length > 3 && (
                    <Link to="/disputes" className="block text-center text-xs text-primary-600 hover:underline pt-1">
                      View all {disputes.length} disputes
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
