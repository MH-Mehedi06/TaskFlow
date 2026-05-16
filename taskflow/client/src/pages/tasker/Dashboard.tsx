import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  DollarSign, CheckCircle, Clock, Star, ExternalLink,
  Loader2, AlertTriangle, TrendingUp, ChevronRight, Send,
  ShieldAlert, MessageSquare, Bell, User, ThumbsUp, X, FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetMyProfileQuery } from '../../features/taskers/taskerApi';
import { useGetAvailableTasksQuery, useGetMyTasksQuery, useGetMyTaskStatsQuery } from '../../features/tasks/taskApi';
import { useGetPaymentHistoryQuery, useCreateConnectAccountMutation, useGetConnectOnboardingLinkQuery } from '../../features/payments/paymentApi';
import { useGetReviewsByUserQuery } from '../../features/reviews/reviewApi';
import { useGetMyDisputesQuery } from '../../features/disputes/disputeApi';
import { useApplyToTaskMutation, useGetMyApplicationsQuery } from '../../features/applications/applicationApi';
import { useAppSelector } from '../../app/hooks';
import { ITask, ICategory, IUser, IReview, IDispute, ITaskApplication } from '../../types';
import { TASK_STATUS_STYLES, APP_STATUS_STYLES, DISPUTE_STATUS_STYLES } from '../../constants/statusStyles';

function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-500',
    held: 'bg-blue-100 text-blue-700',
    captured: 'bg-green-100 text-green-700',
    refunded: 'bg-red-100 text-red-500',
  };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>{status}</span>;
}

function StarRow({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const w = size === 'md' ? 'w-4 h-4' : 'w-3 h-3';
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${w} ${i <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
      ))}
    </span>
  );
}

// ── Apply modal ───────────────────────────────────────────────────────────────
function ApplyModal({ task, onClose }: { task: ITask; onClose: () => void }) {
  const [applyToTask, { isLoading }] = useApplyToTaskMutation();
  const [coverLetter, setCoverLetter] = useState('');
  const [proposedRate, setProposedRate] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coverLetter.trim()) { toast.error('Cover letter is required'); return; }
    if (!proposedRate || Number(proposedRate) < 1) { toast.error('Please enter a valid rate'); return; }
    try {
      await applyToTask({ taskId: task._id, coverLetter, proposedRate: Number(proposedRate) }).unwrap();
      toast.success('Application submitted!');
      onClose();
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message;
      toast.error(msg ?? 'Failed to submit application');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Apply for Task</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4 bg-gray-50 rounded-lg p-3">{task.title}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your hourly rate ($)</label>
            <input
              type="number"
              min={1}
              step={0.5}
              value={proposedRate}
              onChange={(e) => setProposedRate(e.target.value)}
              placeholder="e.g. 35"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {task.estimatedHours && proposedRate && Number(proposedRate) > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                Estimated total: ${(Number(proposedRate) * task.estimatedHours).toFixed(2)} for {task.estimatedHours}h
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cover letter <span className="text-gray-400 font-normal">(max 1000 chars)</span>
            </label>
            <textarea
              rows={4}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              maxLength={1000}
              placeholder="Why are you the best fit for this task? Mention your experience and approach…"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">{coverLetter.length}/1000</p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 bg-primary-700 hover:bg-primary-800 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isLoading ? 'Submitting…' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Available task card ───────────────────────────────────────────────────────
function AvailableTaskCard({ task }: { task: ITask }) {
  const cat = task.categoryId as ICategory;
  const client = task.clientId as IUser;
  const [showApplyModal, setShowApplyModal] = useState(false);

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-primary-300 transition-colors">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-2">
            <span className="text-xl">{cat?.icon}</span>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{task.title}</p>
              <p className="text-xs text-gray-400">{cat?.name} · by {client?.name}</p>
            </div>
          </div>
          {task.estimatedHours && (
            <span className="text-xs text-gray-400 flex-shrink-0">{task.estimatedHours}h est.</span>
          )}
        </div>
        <p className="text-xs text-gray-500 line-clamp-2 mb-3">{task.description}</p>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>📅 {new Date(task.scheduledAt).toLocaleDateString()}</span>
          <div className="flex items-center gap-2">
            <Link
              to={`/tasks/${task._id}`}
              className="text-primary-600 hover:underline text-xs font-medium"
            >
              View details
            </Link>
            <button
              onClick={() => setShowApplyModal(true)}
              className="flex items-center gap-1 bg-primary-700 hover:bg-primary-800 text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <Send className="w-3 h-3" /> Apply
            </button>
          </div>
        </div>
      </div>

      {showApplyModal && (
        <ApplyModal task={task} onClose={() => setShowApplyModal(false)} />
      )}
    </>
  );
}

// ── My application card ───────────────────────────────────────────────────────
function MyApplicationCard({ application }: { application: ITaskApplication }) {
  const task = application.taskId as ITask;
  const cat = task ? (task.categoryId as ICategory) : null;

  return (
    <Link
      to={`/tasks/${typeof task === 'object' ? task._id : task}`}
      className="flex items-center justify-between gap-3 bg-white rounded-xl border border-gray-200 hover:border-primary-300 p-4 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xl">{cat?.icon ?? '📋'}</span>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate text-sm">
            {typeof task === 'object' ? task.title : 'Task'}
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
            <span>${application.proposedRate}/hr</span>
            <span>·</span>
            <span>{new Date(application.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${APP_STATUS_STYLES[application.status] ?? 'bg-gray-100 text-gray-500'}`}>
        {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
      </span>
    </Link>
  );
}

function ReviewCard({ review }: { review: IReview }) {
  const reviewer = review.reviewerId as IUser;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start gap-3">
        {typeof reviewer === 'object' && reviewer?.avatar ? (
          <img src={reviewer.avatar} alt={reviewer.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
            {typeof reviewer === 'object' ? reviewer?.name?.charAt(0) : '?'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {typeof reviewer === 'object' ? reviewer?.name : 'Client'}
            </p>
            <StarRow rating={review.rating} />
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
          {review.reply && (
            <div className="mt-2 pl-3 border-l-2 border-primary-200">
              <p className="text-xs text-gray-500 italic">{review.reply}</p>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2">{new Date(review.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}

function ConnectSection() {
  const { data: profile } = useGetMyProfileQuery();
  const [createAccount, { isLoading: creating }] = useCreateConnectAccountMutation();
  const { data: linkData, refetch: refetchLink } = useGetConnectOnboardingLinkQuery(undefined, {
    skip: !profile?.stripeAccountId,
  });
  const [searchParams] = useSearchParams();
  const stripeStatus = searchParams.get('stripe');
  const hasAccount = !!profile?.stripeAccountId;

  const handleCreate = async () => {
    try {
      await createAccount().unwrap();
      await refetchLink();
      toast.success('Stripe Connect account created!');
    } catch { toast.error('Failed to create Connect account'); }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center">
          <DollarSign className="w-5 h-5 text-primary-700" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Stripe Payouts</h3>
          <p className="text-xs text-gray-500">Receive earnings to your bank</p>
        </div>
      </div>

      {stripeStatus === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3 flex items-center gap-2 text-sm text-green-700">
          <CheckCircle className="w-4 h-4" /> Connected!
        </div>
      )}

      {!hasAccount ? (
        <button
          onClick={handleCreate}
          disabled={creating}
          className="w-full flex items-center justify-center gap-2 bg-primary-700 hover:bg-primary-800 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
          {creating ? 'Setting up…' : 'Set up payouts'}
        </button>
      ) : linkData ? (
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
            Account: <code className="bg-gray-100 px-1.5 py-0.5 rounded">{profile?.stripeAccountId?.slice(0, 12)}…</code>
          </div>
          {!linkData.isMock && (
            <button
              onClick={() => { if (linkData.url) window.location.href = linkData.url; }}
              className="w-full flex items-center justify-center gap-2 border border-primary-600 text-primary-700 hover:bg-primary-50 font-semibold py-2 rounded-xl transition-colors text-sm"
            >
              <ExternalLink className="w-4 h-4" /> Complete onboarding
            </button>
          )}
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5" /> Dev mode — no Stripe keys
        </div>
      )}
    </div>
  );
}

function ProfileCompletenessCard() {
  const { data: profile } = useGetMyProfileQuery();
  const { user } = useAppSelector((s) => s.auth);

  const checks = [
    { label: 'Photo uploaded', done: !!user?.avatar },
    { label: 'Headline set', done: !!profile?.headline },
    { label: 'Bio written', done: (profile?.bio?.length ?? 0) >= 20 },
    { label: 'Skills added', done: (profile?.skills?.length ?? 0) > 0 },
    { label: 'Rates configured', done: (profile?.hourlyRates?.length ?? 0) > 0 },
    { label: 'Availability set', done: (profile?.availability?.length ?? 0) > 0 },
  ];

  const done = checks.filter((c) => c.done).length;
  const pct = Math.round((done / checks.length) * 100);
  const isComplete = done === checks.length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
          <User className="w-4 h-4" /> Profile
        </h3>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isComplete ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
          {pct}%
        </span>
      </div>

      <div className="h-2 bg-gray-100 rounded-full mb-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isComplete ? 'bg-green-500' : 'bg-primary-600'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="space-y-1.5">
        {checks.map(({ label, done: isDone }) => (
          <div key={label} className="flex items-center gap-2 text-xs">
            <span className={isDone ? 'text-green-500' : 'text-gray-300'}>{isDone ? '✓' : '○'}</span>
            <span className={isDone ? 'text-gray-600' : 'text-gray-400'}>{label}</span>
          </div>
        ))}
      </div>

      {!isComplete && (
        <Link
          to="/tasker/onboarding"
          className="mt-4 block text-center text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 py-2 rounded-lg transition-colors"
        >
          Complete profile →
        </Link>
      )}
    </div>
  );
}

type Tab = 'available' | 'my-tasks' | 'applications' | 'reviews' | 'earnings';

export default function TaskerDashboard() {
  const { user } = useAppSelector((s) => s.auth);
  const [activeTab, setActiveTab] = useState<Tab>('available');

  const { data: profile } = useGetMyProfileQuery();
  const { data: myTasksData, isLoading: myLoading, isError: myError } = useGetMyTasksQuery({ limit: 20 }, { skip: activeTab !== 'my-tasks' });
  const { data: availData, isLoading: availLoading, isError: availError } = useGetAvailableTasksQuery({ limit: 12 }, { skip: activeTab !== 'available' });
  const { data: payHistory = [], isLoading: histLoading } = useGetPaymentHistoryQuery(undefined, { skip: activeTab !== 'earnings' });
  const { data: reviewsData, isLoading: revLoading } = useGetReviewsByUserQuery({ userId: user?._id ?? '' }, { skip: activeTab !== 'reviews' || !user?._id });
  const { data: myAppsData, isLoading: appsLoading } = useGetMyApplicationsQuery({ limit: 20 }, { skip: activeTab !== 'applications' });
  const reviews = reviewsData?.reviews ?? [];
  const { data: disputes = [] } = useGetMyDisputesQuery();
  const { data: stats } = useGetMyTaskStatsQuery();

  const myTasks = myTasksData?.data ?? [];
  const availTasks = (availData as unknown as { data: ITask[] })?.data ?? [];
  const myApplications = myAppsData?.data ?? [];
  const openDisputes = (disputes as IDispute[]).filter((d) => ['open', 'under_review'].includes(d.status));

  const pendingApps = myApplications.filter((a) => a.status === 'pending').length;

  const TABS: { key: Tab; label: string }[] = [
    { key: 'available', label: 'Available' },
    { key: 'my-tasks', label: 'My Tasks' },
    { key: 'applications', label: `Applications${pendingApps > 0 ? ` (${pendingApps})` : ''}` },
    { key: 'reviews', label: `Reviews${reviews.length > 0 ? ` (${reviews.length})` : ''}` },
    { key: 'earnings', label: 'Earnings' },
  ];

  return (
    <>
      <Helmet><title>Tasker Dashboard | TaskFlow</title></Helmet>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {profile?.avgRating ? (
                <span className="flex items-center gap-1.5 text-sm">
                  <StarRow rating={profile.avgRating} size="md" />
                  <span className="text-gray-700 font-medium">{profile.avgRating.toFixed(1)}</span>
                  <span className="text-gray-400">({profile.totalReviews} reviews)</span>
                </span>
              ) : 'No reviews yet — get started!'}
            </p>
          </div>
          <Link
            to={`/taskers/${profile?._id ?? ''}`}
            className="flex items-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-600 font-medium px-4 py-2 rounded-xl text-sm transition-colors"
          >
            View profile <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: DollarSign, label: 'Total Earned', value: `$${(stats?.totalEarned ?? 0).toFixed(2)}`, color: 'text-green-600', bg: 'bg-green-50' },
            { icon: CheckCircle, label: 'Completed', value: stats?.completed ?? 0, color: 'text-primary-700', bg: 'bg-primary-50' },
            { icon: Clock, label: 'Active Tasks', value: (stats?.assigned ?? 0) + (stats?.in_progress ?? 0), color: 'text-amber-600', bg: 'bg-amber-50' },
            { icon: ThumbsUp, label: 'Avg Rating', value: profile?.avgRating ? profile.avgRating.toFixed(1) : '—', color: 'text-yellow-600', bg: 'bg-yellow-50' },
          ].map(({ icon: Icon, label, value, color, bg }) => (
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
          {/* Main content */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 overflow-x-auto">
              {TABS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex-shrink-0 flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${activeTab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Available tasks */}
            {activeTab === 'available' && (
              availLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary-700" /></div>
              ) : availError ? (
                <div className="text-center py-16 text-gray-400">
                  <p className="text-3xl mb-3">⚠️</p>
                  <p className="font-medium text-gray-600">Failed to load available tasks</p>
                  <p className="text-sm mt-1">Check your connection and try refreshing.</p>
                </div>
              ) : availTasks.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <p className="text-3xl mb-3">📭</p>
                  <p>No tasks available in your categories right now.</p>
                  <p className="text-sm mt-1">Check back soon or update your skills.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availTasks.map((t) => <AvailableTaskCard key={t._id} task={t} />)}
                </div>
              )
            )}

            {/* My tasks */}
            {activeTab === 'my-tasks' && (
              myLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary-700" /></div>
              ) : myError ? (
                <div className="text-center py-16 text-gray-400">
                  <p className="text-3xl mb-3">⚠️</p>
                  <p className="font-medium text-gray-600">Failed to load your tasks</p>
                  <p className="text-sm mt-1">Check your connection and try refreshing.</p>
                </div>
              ) : myTasks.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <p className="text-3xl mb-3">📋</p>
                  <p>You haven't been assigned any tasks yet.</p>
                  <p className="text-sm mt-1">Apply to available tasks to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myTasks.map((task) => {
                    const cat = task.categoryId as ICategory;
                    return (
                      <Link
                        key={task._id}
                        to={`/tasks/${task._id}`}
                        className="flex items-center justify-between gap-3 bg-white rounded-xl border border-gray-200 hover:border-primary-300 p-4 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xl">{cat?.icon}</span>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate text-sm">{task.title}</p>
                            <p className="text-xs text-gray-400">{new Date(task.scheduledAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {task.price && <span className="text-sm font-semibold text-gray-700">${task.price}</span>}
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TASK_STATUS_STYLES[task.status]}`}>
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )
            )}

            {/* Applications tab */}
            {activeTab === 'applications' && (
              appsLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary-700" /></div>
              ) : myApplications.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No applications yet.</p>
                  <p className="text-sm mt-1">Browse available tasks and apply to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myApplications.map((app) => (
                    <MyApplicationCard key={app._id} application={app} />
                  ))}
                </div>
              )
            )}

            {/* Reviews tab */}
            {activeTab === 'reviews' && (
              revLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary-700" /></div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No reviews yet. Complete tasks to earn reviews!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((r) => <ReviewCard key={r._id} review={r} />)}
                </div>
              )
            )}

            {/* Earnings history */}
            {activeTab === 'earnings' && (
              histLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary-700" /></div>
              ) : payHistory.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No earnings yet. Complete tasks to start earning!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payHistory.map((task) => {
                    const cat = task.categoryId as ICategory;
                    return (
                      <div key={task._id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xl">{cat?.icon}</span>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-gray-800 truncate">{task.title}</p>
                            <p className="text-xs text-gray-400">{new Date(task.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="font-bold text-green-600">
                            {task.taskerEarnings != null ? `+$${task.taskerEarnings.toFixed(2)}` : '—'}
                          </span>
                          <PaymentStatusBadge status={task.paymentStatus} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <ConnectSection />
            <ProfileCompletenessCard />

            {/* Disputes */}
            {(disputes as IDispute[]).length > 0 && (
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
                <div className="space-y-2">
                  {(disputes as IDispute[]).slice(0, 3).map((d) => (
                    <Link
                      key={d._id}
                      to={`/disputes/${d._id}`}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <p className="text-xs font-medium text-gray-800">#{d._id.slice(-6).toUpperCase()}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${DISPUTE_STATUS_STYLES[d.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {d.status.replace(/_/g, ' ')}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Quick links */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-bold text-gray-900 text-sm mb-3">Quick Links</h3>
              <div className="space-y-1">
                {[
                  { to: '/tasker/onboarding', icon: User, label: 'Edit my profile' },
                  { to: '/chat', icon: MessageSquare, label: 'Messages' },
                  { to: '/notifications', icon: Bell, label: 'Notifications' },
                  { to: '/taskers', icon: Star, label: 'Browse marketplace' },
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
          </div>
        </div>
      </div>
    </>
  );
}
