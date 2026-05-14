import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Search, Star, ChevronLeft, ChevronRight, Shield, ShieldCheck, Award, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useGetAdminTaskersQuery, useToggleEliteBadgeMutation, useToggleBackgroundCheckMutation,
} from '../../features/admin/adminApi';
import { ITaskerProfile, IUser } from '../../types';
import { TableSkeleton, StatCardSkeleton } from '../../components/admin/Skeleton';
import TaskerDrawer from '../../components/admin/TaskerDrawer';

type TaskerWithUser = ITaskerProfile & {
  userId: IUser & { isVerified?: boolean; isBanned?: boolean; isActive?: boolean; createdAt?: string };
};

export default function Taskers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [eliteFilter, setEliteFilter] = useState('');
  const [selectedTasker, setSelectedTasker] = useState<TaskerWithUser | null>(null);

  const { data, isLoading } = useGetAdminTaskersQuery({ page, search: search || undefined, elite: eliteFilter || undefined });
  const [toggleElite] = useToggleEliteBadgeMutation();
  const [toggleBg] = useToggleBackgroundCheckMutation();

  const taskers = (data?.taskers ?? []) as TaskerWithUser[];
  const eliteCount = taskers.filter((t) => t.isElite).length;
  const bgCount = taskers.filter((t) => t.backgroundChecked).length;

  const handleElite = async (e: React.MouseEvent, id: string, current: boolean) => {
    e.stopPropagation();
    try {
      await toggleElite({ id, isElite: !current }).unwrap();
      toast.success(!current ? 'Elite badge granted' : 'Elite badge removed');
    } catch { toast.error('Failed to update elite status'); }
  };

  const handleBgCheck = async (e: React.MouseEvent, id: string, current: boolean) => {
    e.stopPropagation();
    try {
      await toggleBg({ id, backgroundChecked: !current }).unwrap();
      toast.success(!current ? 'Background check verified' : 'Background check removed');
    } catch { toast.error('Failed to update background check'); }
  };

  const TABLE_COLS = 6;

  return (
    <>
      <Helmet><title>Taskers | Admin</title></Helmet>

      {selectedTasker && (
        <TaskerDrawer
          tasker={selectedTasker}
          onClose={() => setSelectedTasker(null)}
        />
      )}

      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Taskers</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage profiles, elite badges and background checks — click a row for details</p>
        </div>

        {/* Summary cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total taskers', value: data?.total ?? 0, icon: Briefcase, color: 'bg-primary-50 text-primary-600' },
              { label: 'This page', value: taskers.length, icon: Search, color: 'bg-gray-50 text-gray-600' },
              { label: 'Elite (page)', value: eliteCount, icon: Award, color: 'bg-amber-50 text-amber-600' },
              { label: 'BG checked (page)', value: bgCount, icon: ShieldCheck, color: 'bg-green-50 text-green-600' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center mb-2`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }}
              placeholder="Search by name or email… (Enter)"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={eliteFilter}
            onChange={(e) => { setEliteFilter(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
          >
            <option value="">All taskers</option>
            <option value="true">Elite only</option>
            <option value="false">Non-elite only</option>
          </select>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tasker</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Rating</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tasks</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Elite</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">BG Check</th>
                </tr>
              </thead>
              {isLoading ? (
                <TableSkeleton rows={8} cols={TABLE_COLS} />
              ) : (
                <tbody className="divide-y divide-gray-100">
                  {taskers.length === 0 ? (
                    <tr><td colSpan={TABLE_COLS} className="text-center py-12 text-gray-400">No taskers found.</td></tr>
                  ) : taskers.map((t) => {
                    const user = t.userId as IUser & { isVerified?: boolean; isBanned?: boolean };
                    return (
                      <tr
                        key={t._id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => setSelectedTasker(t)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">
                                {user.name?.charAt(0)}
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900">{user.name}</p>
                              <p className="text-xs text-gray-400">{user.email}</p>
                              {t.headline && <p className="text-xs text-gray-400 italic truncate max-w-[160px]">{t.headline}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span className="text-sm font-semibold text-gray-800">{t.avgRating.toFixed(1)}</span>
                            <span className="text-xs text-gray-400">({t.totalReviews})</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-700">{t.totalTasksCompleted}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            {user.isVerified
                              ? <span className="text-xs font-medium text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full w-fit">Verified</span>
                              : <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full w-fit">Unverified</span>}
                            {user.isBanned && (
                              <span className="text-xs font-medium text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full w-fit">Banned</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => handleElite(e, t._id, t.isElite)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                              t.isElite
                                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                : 'bg-gray-100 text-gray-500 hover:bg-amber-50 hover:text-amber-600'
                            }`}
                          >
                            <Award className="w-3.5 h-3.5" />
                            {t.isElite ? 'Elite' : 'Grant'}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => handleBgCheck(e, t._id, t.backgroundChecked)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                              t.backgroundChecked
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-600'
                            }`}
                          >
                            {t.backgroundChecked ? <ShieldCheck className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                            {t.backgroundChecked ? 'Verified' : 'Mark'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              )}
            </table>
          </div>
          {!isLoading && (
            <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400 bg-gray-50">
              {data?.total ?? 0} taskers total
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
