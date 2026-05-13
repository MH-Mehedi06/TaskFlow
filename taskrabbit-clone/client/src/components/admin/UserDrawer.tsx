import { X, Shield, Ban, Briefcase, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetUserByIdQuery, useUpdateUserRoleMutation, useBanUserMutation } from '../../features/admin/adminApi';
import { IUser, ITaskerProfile } from '../../types';
import { SkeletonLine, SkeletonAvatar } from './Skeleton';

interface Props {
  userId: string;
  currentAdminId: string;
  onClose: () => void;
}

export default function UserDrawer({ userId, currentAdminId, onClose }: Props) {
  const { data, isLoading } = useGetUserByIdQuery(userId);
  const [updateRole] = useUpdateUserRoleMutation();
  const [banUser] = useBanUserMutation();

  const user = data?.user as (IUser & { isBanned?: boolean; isActive?: boolean; createdAt?: string }) | undefined;
  const profile = data?.profile as ITaskerProfile | undefined;
  const taskCount = data?.taskCount ?? 0;

  const isSelf = userId === currentAdminId;

  const handleRole = async (role: string) => {
    if (isSelf) { toast.error('Cannot change your own role'); return; }
    try { await updateRole({ id: userId, role }).unwrap(); toast.success('Role updated'); }
    catch { toast.error('Failed'); }
  };

  const handleBan = async (banned: boolean) => {
    if (isSelf) { toast.error('Cannot ban yourself'); return; }
    try { await banUser({ id: userId, banned }).unwrap(); toast.success(banned ? 'User banned' : 'User unbanned'); }
    catch { toast.error('Failed'); }
  };

  return (
    <>
      {/* backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* drawer */}
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white shadow-2xl flex flex-col">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="font-bold text-gray-900">User details</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <SkeletonAvatar size="w-16 h-16" />
                <div className="space-y-2 flex-1">
                  <SkeletonLine w="w-1/2" h="h-5" />
                  <SkeletonLine w="w-2/3" h="h-3" />
                  <SkeletonLine w="w-1/3" h="h-3" />
                </div>
              </div>
              {Array.from({ length: 4 }).map((_, i) => <SkeletonLine key={i} h="h-10" />)}
            </div>
          ) : !user ? (
            <p className="text-gray-400 text-sm text-center py-10">User not found.</p>
          ) : (
            <>
              {/* Profile */}
              <div className="flex items-start gap-4">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-primary-100 text-primary-700 text-xl font-bold flex items-center justify-center flex-shrink-0">
                    {user.name?.charAt(0)?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 text-lg leading-tight">{user.name}</p>
                  <p className="text-sm text-gray-500 truncate">{user.email}</p>
                  <p className="text-xs text-gray-400 mt-1 capitalize">{user.role}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {user.isVerified
                      ? <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" />Verified</span>
                      : <span className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3" />Unverified</span>}
                    {user.isBanned && <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Banned</span>}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{taskCount}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Tasks</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-sm font-semibold text-gray-700">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Joined</p>
                </div>
              </div>

              {/* Tasker profile (if applicable) */}
              {profile && (
                <div className="border border-gray-200 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" /> Tasker profile
                  </p>
                  {profile.headline && <p className="text-sm font-medium text-gray-800">{profile.headline}</p>}
                  {profile.bio && <p className="text-xs text-gray-500 line-clamp-3">{profile.bio}</p>}
                  <div className="flex items-center gap-4 text-xs text-gray-500 pt-1">
                    <span>⭐ {profile.avgRating.toFixed(1)} ({profile.totalReviews} reviews)</span>
                    <span>{profile.totalTasksCompleted} completed</span>
                  </div>
                  <div className="flex gap-1.5 mt-1">
                    {profile.isElite && <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Elite</span>}
                    {profile.backgroundChecked && <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">BG Checked</span>}
                  </div>
                </div>
              )}

              {/* Actions */}
              {!isSelf && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> Moderation
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Change role</label>
                    <select
                      value={user.role}
                      onChange={(e) => handleRole(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="client">Client</option>
                      <option value="tasker">Tasker</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <button
                    onClick={() => handleBan(!user.isBanned)}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      user.isBanned
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
                    }`}
                  >
                    <Ban className="w-4 h-4" />
                    {user.isBanned ? 'Unban user' : 'Ban user'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}
