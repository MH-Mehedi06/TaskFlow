import { X, Star, Award, ShieldCheck, Shield, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useToggleEliteBadgeMutation, useToggleBackgroundCheckMutation } from '../../features/admin/adminApi';
import { ITaskerProfile, IUser, ICategory } from '../../types';
import { SkeletonLine, SkeletonAvatar } from './Skeleton';

type TaskerWithUser = ITaskerProfile & {
  userId: IUser & { isVerified?: boolean; isBanned?: boolean; createdAt?: string };
};

interface Props {
  tasker: TaskerWithUser;
  onClose: () => void;
}

export default function TaskerDrawer({ tasker, onClose }: Props) {
  const [toggleElite, { isLoading: togglingElite }] = useToggleEliteBadgeMutation();
  const [toggleBg, { isLoading: togglingBg }] = useToggleBackgroundCheckMutation();

  const user = tasker.userId as IUser & { isVerified?: boolean; isBanned?: boolean; createdAt?: string };

  const handleElite = async () => {
    try {
      await toggleElite({ id: tasker._id, isElite: !tasker.isElite }).unwrap();
      toast.success(!tasker.isElite ? 'Elite badge granted' : 'Elite badge removed');
    } catch { toast.error('Failed'); }
  };

  const handleBg = async () => {
    try {
      await toggleBg({ id: tasker._id, backgroundChecked: !tasker.backgroundChecked }).unwrap();
      toast.success(!tasker.backgroundChecked ? 'Background check verified' : 'Background check removed');
    } catch { toast.error('Failed'); }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="font-bold text-gray-900">Tasker profile</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Header */}
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
              {tasker.headline && <p className="text-sm text-gray-500 mt-0.5">{tasker.headline}</p>}
              <p className="text-xs text-gray-400">{user.email}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {user.isVerified
                  ? <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" />Verified</span>
                  : <span className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3" />Unverified</span>}
                {(user as IUser & { isBanned?: boolean }).isBanned && (
                  <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Banned</span>
                )}
              </div>
            </div>
          </div>

          {/* Ratings & stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-0.5 mb-0.5">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-base font-bold text-gray-900">{tasker.avgRating.toFixed(1)}</span>
              </div>
              <p className="text-[11px] text-gray-500">{tasker.totalReviews} reviews</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-base font-bold text-gray-900">{tasker.totalTasksCompleted}</p>
              <p className="text-[11px] text-gray-500">Completed</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-base font-bold text-gray-900">{tasker.serviceRadius}mi</p>
              <p className="text-[11px] text-gray-500">Radius</p>
            </div>
          </div>

          {/* Bio */}
          {tasker.bio && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Bio</p>
              <p className="text-sm text-gray-600 leading-relaxed">{tasker.bio}</p>
            </div>
          )}

          {/* Skills */}
          {tasker.skills?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {tasker.skills.map((s: ICategory | string) => {
                  const name = typeof s === 'string' ? s : s.name;
                  const icon = typeof s === 'string' ? '' : s.icon;
                  return (
                    <span key={typeof s === 'string' ? s : s._id} className="text-xs bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full font-medium">
                      {icon} {name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Certifications */}
          {tasker.certifications?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Certifications</p>
              <ul className="space-y-1">
                {tasker.certifications.map((cert, i) => (
                  <li key={i} className="text-xs text-gray-600 flex items-center gap-1.5">
                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> {cert}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Joined */}
          {user.createdAt && (
            <p className="text-xs text-gray-400">Joined {new Date(user.createdAt).toLocaleDateString()}</p>
          )}

          {/* Admin actions */}
          <div className="space-y-3 border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Admin actions</p>
            <button
              onClick={handleElite}
              disabled={togglingElite}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                tasker.isElite
                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-700'
                  : 'bg-gray-100 hover:bg-amber-50 hover:text-amber-700 text-gray-600'
              }`}
            >
              <Award className="w-4 h-4" />
              {tasker.isElite ? 'Remove elite badge' : 'Grant elite badge'}
            </button>
            <button
              onClick={handleBg}
              disabled={togglingBg}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                tasker.backgroundChecked
                  ? 'bg-green-100 hover:bg-green-200 text-green-700'
                  : 'bg-gray-100 hover:bg-green-50 hover:text-green-700 text-gray-600'
              }`}
            >
              {tasker.backgroundChecked ? <ShieldCheck className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
              {tasker.backgroundChecked ? 'Remove background check' : 'Mark as background checked'}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
