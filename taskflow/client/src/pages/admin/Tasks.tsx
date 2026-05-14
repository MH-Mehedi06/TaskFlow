import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, MapPin, Clock, DollarSign, User, UserPlus, X, Loader2, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetAllTasksQuery, useAssignTaskerMutation } from '../../features/admin/adminApi';
import { useGetAdminTaskersQuery } from '../../features/admin/adminApi';
import { ITask, IUser, ICategory, ITaskerProfile } from '../../types';
import { TableSkeleton } from '../../components/admin/Skeleton';

const TASK_STATUS_COLORS: Record<string, string> = {
  posted: 'bg-blue-100 text-blue-700',
  assigned: 'bg-indigo-100 text-indigo-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-500',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  held: 'bg-blue-100 text-blue-600',
  captured: 'bg-green-100 text-green-700',
  refunded: 'bg-red-100 text-red-500',
};

// ── Assign Tasker Modal ──────────────────────────────────────────────────────

function AssignTaskerModal({
  task,
  onClose,
}: {
  task: ITask;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [assignTasker, { isLoading }] = useAssignTaskerMutation();
  const { data } = useGetAdminTaskersQuery({ page: 1, search: search || undefined });
  const taskers = data?.taskers ?? [];

  const handleAssign = async () => {
    if (!selectedId) return;
    try {
      await assignTasker({ taskId: task._id, taskerId: selectedId }).unwrap();
      toast.success('Tasker assigned successfully');
      onClose();
    } catch {
      toast.error('Failed to assign tasker');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="font-bold text-gray-900">Assign Tasker</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-sm">{task.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 pt-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search taskers…"
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Tasker list */}
        <div className="px-6 pb-2 max-h-72 overflow-y-auto space-y-2">
          {taskers.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-6">No taskers found.</p>
          ) : taskers.map((t: ITaskerProfile) => {
            const user = t.userId as IUser;
            const isSelected = selectedId === String(t.userId?._id ?? t.userId);
            return (
              <div
                key={t._id}
                onClick={() => setSelectedId(String(t.userId?._id ?? t.userId))}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                  isSelected ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <img
                  src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name ?? 'T')}&background=1D4ED8&color=fff`}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800">{user?.name ?? '—'}</p>
                  <p className="text-xs text-gray-400 truncate">{user?.email ?? ''}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs text-gray-500">{t.avgRating.toFixed(1)} · {t.totalReviews} reviews · {t.totalTasksCompleted} tasks</span>
                  </div>
                </div>
                {t.isElite && (
                  <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full flex-shrink-0">Elite</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedId || isLoading}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-primary-700 hover:bg-primary-800 disabled:opacity-50 rounded-lg transition-colors"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Assign Tasker
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Task detail expanded row ──────────────────────────────────────────────────

function TaskDetailRow({
  task,
  onAssign,
}: {
  task: ITask;
  onAssign: (task: ITask) => void;
}) {
  const client = task.clientId as IUser | undefined;
  const tasker = task.taskerId as IUser | undefined;
  const category = task.categoryId as ICategory | undefined;
  const canAssign = task.status !== 'completed' && task.status !== 'cancelled';

  return (
    <tr>
      <td colSpan={6} className="px-4 pb-4 pt-0">
        <div className="bg-gray-50 rounded-xl p-4 grid md:grid-cols-2 gap-4 border border-gray-200">
          {/* Left col */}
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</p>
              <p className="text-sm text-gray-700 leading-relaxed">{task.description || '—'}</p>
            </div>
            {task.address && (
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                <span>{task.address}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>Scheduled: {new Date(task.scheduledAt).toLocaleString()}</span>
            </div>
            {task.estimatedHours && (
              <p className="text-sm text-gray-600">Estimated: <strong>{task.estimatedHours}h</strong></p>
            )}
            {task.notes && (
              <p className="text-xs text-gray-500 italic">Notes: {task.notes}</p>
            )}
          </div>

          {/* Right col */}
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
                <p className="text-base font-bold text-gray-900">{task.price ? `$${task.price.toFixed(2)}` : '—'}</p>
                <p className="text-[11px] text-gray-500">Total price</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
                <p className="text-base font-bold text-emerald-700">{task.platformFee ? `$${task.platformFee.toFixed(2)}` : '—'}</p>
                <p className="text-[11px] text-gray-500">Platform fee</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
                <p className="text-base font-bold text-primary-700">{task.taskerEarnings ? `$${task.taskerEarnings.toFixed(2)}` : '—'}</p>
                <p className="text-[11px] text-gray-500">Tasker earns</p>
              </div>
            </div>

            {task.paymentStatus && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">Payment:</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PAYMENT_STATUS_COLORS[task.paymentStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                  {task.paymentStatus}
                </span>
              </div>
            )}

            {category && typeof category !== 'string' && (
              <p className="text-sm text-gray-600">
                Category: <strong>{category.icon} {category.name}</strong>
              </p>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-xs font-medium text-gray-500">Client:</span>
                <span className="font-medium">{typeof client !== 'string' ? (client?.name ?? '—') : '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-xs font-medium text-gray-500">Tasker:</span>
                {tasker && typeof tasker !== 'string'
                  ? <span className="font-medium text-primary-700">{tasker.name}</span>
                  : <span className="text-gray-400 italic text-xs">Not assigned</span>
                }
              </div>
            </div>

            {task.cancellationReason && (
              <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
                Cancellation: {task.cancellationReason}
              </p>
            )}

            {/* Assign button */}
            {canAssign && (
              <button
                onClick={(e) => { e.stopPropagation(); onAssign(task); }}
                className="flex items-center gap-2 w-full justify-center px-4 py-2 text-sm font-semibold text-white bg-primary-700 hover:bg-primary-800 rounded-xl transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                {tasker ? 'Reassign Tasker' : 'Assign Tasker'}
              </button>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Tasks() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<ITask | null>(null);

  const { data, isLoading } = useGetAllTasksQuery({ page, status: status || undefined, search: search || undefined });
  const tasks = data?.tasks ?? [];

  const TABLE_COLS = 6;

  return (
    <>
      <Helmet><title>Tasks | Admin</title></Helmet>

      {assignTarget && (
        <AssignTaskerModal task={assignTarget} onClose={() => setAssignTarget(null)} />
      )}

      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Tasks</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage tasks — expand a row to assign a tasker or view details</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }}
              placeholder="Search tasks… (Enter)"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
          >
            <option value="">All statuses</option>
            {['posted', 'assigned', 'in_progress', 'completed', 'cancelled'].map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Task</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tasker</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              {isLoading ? (
                <TableSkeleton rows={8} cols={TABLE_COLS} />
              ) : (
                <tbody className="divide-y divide-gray-100">
                  {tasks.length === 0 ? (
                    <tr><td colSpan={TABLE_COLS} className="text-center py-12 text-gray-400">No tasks found.</td></tr>
                  ) : tasks.map((t: ITask) => {
                    const client = t.clientId as IUser | undefined;
                    const tasker = t.taskerId as IUser | undefined;
                    const isOpen = expanded === t._id;
                    return (
                      <>
                        <tr
                          key={t._id}
                          className={`transition-colors cursor-pointer ${isOpen ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                          onClick={() => setExpanded(isOpen ? null : t._id)}
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 truncate max-w-[200px]">{t.title}</p>
                            {t.address && <p className="text-xs text-gray-400 truncate max-w-[200px]">{t.address}</p>}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {typeof client !== 'string' ? client?.name : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {tasker && typeof tasker !== 'string'
                              ? <span className="font-medium text-primary-700">{tasker.name}</span>
                              : <span className="text-gray-400 italic">Unassigned</span>
                            }
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TASK_STATUS_COLORS[t.status] ?? 'bg-gray-100 text-gray-600'}`}>
                              {t.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">
                            {new Date(t.scheduledAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            {isOpen
                              ? <ChevronUp className="w-4 h-4 text-gray-400" />
                              : <ChevronDown className="w-4 h-4 text-gray-300" />}
                          </td>
                        </tr>
                        {isOpen && (
                          <TaskDetailRow
                            key={`detail-${t._id}`}
                            task={t}
                            onAssign={(task) => setAssignTarget(task)}
                          />
                        )}
                      </>
                    );
                  })}
                </tbody>
              )}
            </table>
          </div>
          {!isLoading && (
            <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400 bg-gray-50">
              {data?.total ?? 0} tasks total
            </div>
          )}
        </div>

        {(data?.pages ?? 1) > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{data?.total ?? 0} total</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(page - 1)} disabled={page === 1} className="p-1.5 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 text-gray-600">{page} / {data?.pages}</span>
              <button onClick={() => setPage(page + 1)} disabled={page === (data?.pages ?? 1)} className="p-1.5 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
