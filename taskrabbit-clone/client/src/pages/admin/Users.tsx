import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Search, Ban, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  useGetUsersQuery, useUpdateUserRoleMutation, useBanUserMutation, useDeleteUserMutation,
} from '../../features/admin/adminApi';
import { RootState } from '../../app/store';
import { IUser } from '../../types';
import { TableSkeleton } from '../../components/admin/Skeleton';
import UserDrawer from '../../components/admin/UserDrawer';
import ConfirmModal from '../../components/admin/ConfirmModal';

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{label}</span>;
}

type UserWithMeta = IUser & { isBanned?: boolean; createdAt?: string };

export default function Users() {
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null);

  const currentUser = useSelector((s: RootState) => s.auth.user);
  const { data, isLoading } = useGetUsersQuery({ page, role: role || undefined, search: search || undefined });
  const [updateRole] = useUpdateUserRoleMutation();
  const [banUser] = useBanUserMutation();
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();

  const users = (data?.users ?? []) as UserWithMeta[];

  const handleRole = async (id: string, newRole: string) => {
    try { await updateRole({ id, role: newRole }).unwrap(); toast.success('Role updated'); }
    catch { toast.error('Failed to update role'); }
  };

  const handleBan = async (id: string, banned: boolean) => {
    try { await banUser({ id, banned }).unwrap(); toast.success(banned ? 'User banned' : 'User unbanned'); }
    catch { toast.error('Failed to update ban status'); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteUser(id).unwrap(); toast.success('User deleted'); setDeleteConfirm(null); }
    catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message;
      toast.error(msg ?? 'Failed to delete user');
    }
  };

  const TABLE_COLS = 5;

  return (
    <>
      <Helmet><title>Users | Admin</title></Helmet>

      {drawerUserId && currentUser && (
        <UserDrawer
          userId={drawerUserId}
          currentAdminId={currentUser._id}
          onClose={() => setDrawerUserId(null)}
        />
      )}
      {deleteConfirm && (
        <ConfirmModal
          title="Delete user"
          message={`Are you sure you want to permanently delete this user? This action cannot be undone.`}
          confirmLabel="Delete"
          isLoading={isDeleting}
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Users</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage user roles and access — click a row to see details</p>
        </div>

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
            value={role}
            onChange={(e) => { setRole(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
          >
            <option value="">All roles</option>
            <option value="client">Client</option>
            <option value="tasker">Tasker</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined</th>
                  <th className="px-4 py-3 w-28" />
                </tr>
              </thead>
              {isLoading ? (
                <TableSkeleton rows={8} cols={TABLE_COLS} />
              ) : (
                <tbody className="divide-y divide-gray-100">
                  {users.length === 0 ? (
                    <tr><td colSpan={TABLE_COLS} className="text-center py-12 text-gray-400">No users found.</td></tr>
                  ) : users.map((u) => (
                    <tr
                      key={u._id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setDrawerUserId(u._id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {u.avatar ? (
                            <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">
                              {u.name?.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{u.name}</p>
                            <p className="text-xs text-gray-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={u.role}
                          onChange={(e) => handleRole(u._id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="client">Client</option>
                          <option value="tasker">Tasker</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 flex-wrap">
                          {u.isVerified
                            ? <Badge label="Verified" color="bg-green-100 text-green-700" />
                            : <Badge label="Unverified" color="bg-gray-100 text-gray-500" />}
                          {u.isBanned && <Badge label="Banned" color="bg-red-100 text-red-600" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleBan(u._id, !u.isBanned)}
                            className={`p-2 rounded-lg transition-colors ${u.isBanned ? 'text-green-600 hover:bg-green-50' : 'text-red-500 hover:bg-red-50'}`}
                            title={u.isBanned ? 'Unban user' : 'Ban user'}
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(u._id)}
                            className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
          {!isLoading && (
            <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400 bg-gray-50">
              {data?.total ?? 0} users total
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
