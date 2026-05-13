import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { ChevronLeft, ChevronRight, ClipboardList, Shield } from 'lucide-react';
import { useGetAuditLogQuery, AuditLogEntry } from '../../features/admin/adminApi';
import { TableSkeleton } from '../../components/admin/Skeleton';

const ACTION_COLORS: Record<string, string> = {
  ban_user: 'bg-red-100 text-red-700',
  unban_user: 'bg-green-100 text-green-700',
  delete_user: 'bg-red-200 text-red-800',
  update_role: 'bg-blue-100 text-blue-700',
  resolve_dispute: 'bg-purple-100 text-purple-700',
  approve_review: 'bg-green-100 text-green-700',
  reject_review: 'bg-red-100 text-red-700',
  create_category: 'bg-amber-100 text-amber-700',
  update_category: 'bg-amber-100 text-amber-700',
  delete_category: 'bg-orange-100 text-orange-700',
  grant_elite: 'bg-yellow-100 text-yellow-700',
  revoke_elite: 'bg-gray-100 text-gray-600',
  grant_bg_check: 'bg-teal-100 text-teal-700',
  revoke_bg_check: 'bg-gray-100 text-gray-600',
  update_settings: 'bg-indigo-100 text-indigo-700',
  broadcast_notification: 'bg-sky-100 text-sky-700',
};

const ALL_ACTIONS = [
  'ban_user', 'unban_user', 'delete_user', 'update_role',
  'resolve_dispute',
  'approve_review', 'reject_review',
  'create_category', 'update_category', 'delete_category',
  'grant_elite', 'revoke_elite', 'grant_bg_check', 'revoke_bg_check',
  'update_settings', 'broadcast_notification',
];

const TARGET_TYPES = ['user', 'dispute', 'review', 'category', 'tasker', 'settings', 'notification'];

const TABLE_COLS = 6;

export default function AuditLog() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [targetType, setTargetType] = useState('');

  const { data, isLoading } = useGetAuditLogQuery({
    page,
    action: action || undefined,
    targetType: targetType || undefined,
  });

  const logs = data?.logs ?? [];

  return (
    <>
      <Helmet><title>Audit Log | Admin</title></Helmet>
      <div className="space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Audit Log</h2>
            <p className="text-sm text-gray-500 mt-0.5">Immutable record of all admin actions on the platform</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
            <Shield className="w-3.5 h-3.5" />
            Read-only
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All actions</option>
            {ALL_ACTIONS.map((a) => (
              <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select
            value={targetType}
            onChange={(e) => { setTargetType(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All target types</option>
            {TARGET_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Time</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Admin</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Target</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Details</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">IP</th>
                </tr>
              </thead>
              {isLoading ? (
                <TableSkeleton rows={10} cols={TABLE_COLS} />
              ) : (
                <tbody className="divide-y divide-gray-100">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={TABLE_COLS} className="text-center py-16 text-gray-400">
                        <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p>No audit log entries found.</p>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log: AuditLogEntry) => (
                      <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          <p>{new Date(log.createdAt).toLocaleDateString()}</p>
                          <p className="text-gray-400">{new Date(log.createdAt).toLocaleTimeString()}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 text-sm">{log.adminName}</p>
                          <p className="text-xs text-gray-400 font-mono">{log.adminId.slice(-6)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                            {log.action.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-800">{log.targetLabel ?? '—'}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                              {log.targetType}
                            </span>
                            {log.targetId && (
                              <span className="text-[10px] font-mono text-gray-300">
                                {log.targetId.slice(-8)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-[180px]">
                          <span className="truncate block">{log.details ?? '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-400">
                          {log.ip || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              )}
            </table>
          </div>
          {!isLoading && (
            <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400 bg-gray-50">
              {data?.total ?? 0} entries total
            </div>
          )}
        </div>

        {(data?.pages ?? 1) > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{data?.total ?? 0} total</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 text-gray-600">{page} / {data?.pages}</span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === (data?.pages ?? 1)}
                className="p-1.5 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
