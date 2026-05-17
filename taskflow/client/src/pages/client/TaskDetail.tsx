import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft, Calendar, MapPin, Clock, AlertCircle, MessageSquare,
  X, Loader2, CheckCircle, Star, ShieldAlert, Users, Award, Shield,
  ChevronDown, ChevronUp, Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetTaskByIdQuery, useCancelTaskMutation, useUpdateTaskStatusMutation } from '../../features/tasks/taskApi';
import { useGetReviewByTaskQuery, useCreateReviewMutation } from '../../features/reviews/reviewApi';
import {
  useGetApplicationsQuery,
  useAcceptApplicationMutation,
  useRejectApplicationMutation,
  useCheckMyApplicationQuery,
  useApplyToTaskMutation,
  useWithdrawApplicationMutation,
} from '../../features/applications/applicationApi';
import { useAppSelector } from '../../app/hooks';
import { IUser, ICategory, ITaskApplication } from '../../types';
import { TASK_STATUS_STYLES } from '../../constants/statusStyles';

const TIMELINE: { status: string; label: string; desc: string }[] = [
  { status: 'posted', label: 'Task Posted', desc: 'Accepting applications from Taskers' },
  { status: 'assigned', label: 'Tasker Assigned', desc: 'Tasker has been selected' },
  { status: 'in_progress', label: 'In Progress', desc: 'Work has started' },
  { status: 'completed', label: 'Completed', desc: 'Task is done' },
];

const STATUS_ORDER = ['posted', 'assigned', 'in_progress', 'completed'];

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}>
          <Star className={`w-7 h-7 transition-colors ${n <= value ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
        </button>
      ))}
    </div>
  );
}

// ── Applications panel (client view) ─────────────────────────────────────────
function ApplicationsPanel({ taskId, estimatedHours }: { taskId: string; estimatedHours?: number }) {
  const { data: applications = [], isLoading, isError } = useGetApplicationsQuery(taskId);
  const [acceptApplication, { isLoading: accepting }] = useAcceptApplicationMutation();
  const [rejectApplication, { isLoading: rejecting }] = useRejectApplicationMutation();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actingOnId, setActingOnId] = useState<string | null>(null);

  const handleAccept = async (applicationId: string) => {
    setActingOnId(applicationId);
    try {
      await acceptApplication({ taskId, applicationId }).unwrap();
      toast.success('Tasker accepted! Task is now assigned.');
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message;
      toast.error(msg ?? 'Failed to accept application');
    } finally {
      setActingOnId(null);
    }
  };

  const handleReject = async (applicationId: string) => {
    setActingOnId(applicationId);
    try {
      await rejectApplication({ taskId, applicationId }).unwrap();
      toast.success('Application declined');
    } catch {
      toast.error('Failed to decline application');
    } finally {
      setActingOnId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary-700" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center py-10">
        <p className="text-2xl mb-2">⚠️</p>
        <p className="text-sm text-gray-600 font-medium">Failed to load applications</p>
        <p className="text-xs text-gray-400 mt-1">Try refreshing the page.</p>
      </div>
    );
  }

  const pending = applications.filter((a) => a.status === 'pending');

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
          <Users className="w-5 h-5 text-primary-600" />
          Applications
        </h2>
        <span className="text-sm bg-primary-50 text-primary-700 font-semibold px-2.5 py-1 rounded-full">
          {pending.length} pending
        </span>
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-gray-200 rounded-xl">
          <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No applications yet.</p>
          <p className="text-xs text-gray-400 mt-1">Taskers matching your category will apply soon.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => {
            const tasker = app.taskerId as IUser | string;
            const profile = app.taskerProfile;
            const isExpanded = expandedId === app._id;
            const estimatedTotal = estimatedHours ? app.proposedRate * estimatedHours : null;
            const isPending = app.status === 'pending';

            return (
              <div
                key={app._id}
                className={`border rounded-xl overflow-hidden transition-colors ${
                  app.status === 'accepted' ? 'border-green-300 bg-green-50' :
                  app.status === 'rejected' ? 'border-gray-200 bg-gray-50 opacity-60' :
                  'border-gray-200'
                }`}
              >
                {/* Application header */}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <img
                      src={typeof tasker === 'object' && tasker?.avatar
                        ? tasker.avatar
                        : `https://ui-avatars.com/api/?name=${encodeURIComponent(typeof tasker === 'object' ? tasker?.name ?? 'T' : 'T')}&background=1D4ED8&color=fff`}
                      alt=""
                      className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">
                          {typeof tasker === 'object' ? tasker?.name : 'Tasker'}
                        </span>
                        {profile?.isElite && (
                          <span className="flex items-center gap-0.5 text-xs text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded-full">
                            <Award className="w-3 h-3" /> Elite
                          </span>
                        )}
                        {profile?.backgroundChecked && (
                          <span className="flex items-center gap-0.5 text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                            <Shield className="w-3 h-3" /> Verified
                          </span>
                        )}
                        {app.status !== 'pending' && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            app.status === 'accepted' ? 'bg-green-100 text-green-700' :
                            app.status === 'rejected' ? 'bg-red-100 text-red-600' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                          </span>
                        )}
                      </div>
                      {profile && (
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                          <span className="flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {profile.avgRating.toFixed(1)} ({profile.totalReviews})
                          </span>
                          <span>{profile.totalTasksCompleted} tasks</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-primary-700 text-sm">${app.proposedRate}/hr</p>
                      {estimatedTotal && (
                        <p className="text-xs text-gray-400">~${estimatedTotal.toFixed(0)} total</p>
                      )}
                    </div>
                  </div>

                  {/* Toggle cover letter */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : app._id)}
                    className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 mt-2 ml-14"
                  >
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {isExpanded ? 'Hide cover letter' : 'Read cover letter'}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 ml-14 bg-gray-50 rounded-lg p-3 text-sm text-gray-600 leading-relaxed">
                      {app.coverLetter}
                    </div>
                  )}

                  {/* Actions for pending */}
                  {isPending && (
                    <div className="flex gap-2 mt-3 ml-14">
                      <button
                        onClick={() => handleAccept(app._id)}
                        disabled={accepting || rejecting}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-primary-700 hover:bg-primary-800 disabled:opacity-60 text-white font-semibold py-2 rounded-lg text-xs transition-colors"
                      >
                        {accepting && actingOnId === app._id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <CheckCircle className="w-3 h-3" />}
                        Accept
                      </button>
                      <button
                        onClick={() => handleReject(app._id)}
                        disabled={accepting || rejecting}
                        className="flex-1 flex items-center justify-center gap-1.5 border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-60 font-medium py-2 rounded-lg text-xs transition-colors"
                      >
                        {rejecting && actingOnId === app._id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <X className="w-3 h-3" />}
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Apply panel (tasker view) ─────────────────────────────────────────────────
function TaskerApplyPanel({ taskId }: { taskId: string }) {
  const { data: myApp, isLoading } = useCheckMyApplicationQuery(taskId);
  const [applyToTask, { isLoading: applying }] = useApplyToTaskMutation();
  const [withdrawApplication, { isLoading: withdrawing }] = useWithdrawApplicationMutation();
  const [showForm, setShowForm] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [proposedRate, setProposedRate] = useState('');

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coverLetter.trim()) { toast.error('Cover letter is required'); return; }
    if (!proposedRate || Number(proposedRate) < 1) { toast.error('Please enter a valid rate'); return; }
    try {
      await applyToTask({ taskId, coverLetter, proposedRate: Number(proposedRate) }).unwrap();
      toast.success('Application submitted!');
      setShowForm(false);
      setCoverLetter('');
      setProposedRate('');
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message;
      toast.error(msg ?? 'Failed to submit application');
    }
  };

  const handleWithdraw = async () => {
    try {
      await withdrawApplication(taskId).unwrap();
      toast.success('Application withdrawn');
    } catch {
      toast.error('Failed to withdraw application');
    }
  };

  if (isLoading) return null;

  // Already applied
  if (myApp) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Send className="w-4 h-4 text-primary-600" /> Your Application
        </h3>
        <div className={`text-xs font-semibold px-2.5 py-1 rounded-full inline-block mb-3 ${
          myApp.status === 'pending' ? 'bg-blue-100 text-blue-700' :
          myApp.status === 'accepted' ? 'bg-green-100 text-green-700' :
          myApp.status === 'rejected' ? 'bg-red-100 text-red-600' :
          'bg-gray-100 text-gray-500'
        }`}>
          {myApp.status.charAt(0).toUpperCase() + myApp.status.slice(1)}
        </div>
        <p className="text-sm text-gray-500 mb-1">Proposed rate: <span className="font-semibold text-gray-800">${myApp.proposedRate}/hr</span></p>
        <p className="text-sm text-gray-500 mb-3">Submitted: {new Date(myApp.createdAt).toLocaleDateString()}</p>
        {myApp.status === 'pending' && (
          <button
            onClick={handleWithdraw}
            disabled={withdrawing}
            className="w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-60 font-medium py-2 rounded-lg text-sm transition-colors"
          >
            {withdrawing ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
            Withdraw Application
          </button>
        )}
        {myApp.status === 'accepted' && (
          <p className="text-sm text-green-600 font-medium">Congratulations! You've been selected for this task.</p>
        )}
      </div>
    );
  }

  // Haven't applied yet
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      {!showForm ? (
        <>
          <h3 className="font-bold text-gray-900 mb-1">Interested in this task?</h3>
          <p className="text-sm text-gray-500 mb-4">Submit your application with your rate and a brief cover letter.</p>
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 bg-primary-700 hover:bg-primary-800 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
          >
            <Send className="w-4 h-4" /> Apply Now
          </button>
        </>
      ) : (
        <form onSubmit={handleApply} className="space-y-4">
          <h3 className="font-bold text-gray-900">Apply for this Task</h3>

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
              placeholder="Tell the client why you're the right person for this task…"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">{coverLetter.length}/1000</p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={applying}
              className="flex-1 bg-primary-700 hover:bg-primary-800 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
            >
              {applying ? 'Submitting…' : 'Submit Application'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth);
  const { data: task, isLoading, isError } = useGetTaskByIdQuery(id!);
  const { data: existingReview } = useGetReviewByTaskQuery(id!, { skip: !id });
  const [cancelTask, { isLoading: cancelling }] = useCancelTaskMutation();
  const [updateTaskStatus, { isLoading: updatingStatus }] = useUpdateTaskStatusMutation();
  const [createReview, { isLoading: submittingReview }] = useCreateReviewMutation();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) { toast.error('Please write a comment'); return; }
    try {
      await createReview({ taskId: id!, rating: reviewRating, comment: reviewComment }).unwrap();
      toast.success('Review submitted!');
      setShowReviewForm(false);
    } catch {
      toast.error('Failed to submit review');
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) { toast.error('Please provide a cancellation reason'); return; }
    try {
      await cancelTask({ id: id!, reason: cancelReason }).unwrap();
      toast.success('Task cancelled');
      setShowCancelModal(false);
      navigate('/dashboard');
    } catch {
      toast.error('Failed to cancel task');
    }
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary-700" />
    </div>
  );

  if (isError || !task) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500 mb-3">Task not found.</p>
        <Link to="/dashboard" className="text-primary-600 hover:underline">Back to dashboard</Link>
      </div>
    </div>
  );

  const cat = task.categoryId as ICategory;
  const client = task.clientId as IUser;
  const tasker = task.taskerId as IUser | undefined;
  const canCancel = !['completed', 'cancelled'].includes(task.status);
  const currentIdx = STATUS_ORDER.indexOf(task.status);

  const taskerUserId = tasker
    ? typeof tasker === 'object' ? tasker._id : String(tasker)
    : null;
  const clientUserId = client
    ? typeof client === 'object' ? client._id : String(client)
    : null;
  const isTasker = !!(user && (user._id === taskerUserId || user.role === 'admin'));
  const isClient = !!(user && user._id === clientUserId);
  const canUpdateStatus = isTasker || isClient;
  const isPosted = task.status === 'posted';

  const handleStatusUpdate = async (status: string) => {
    try {
      await updateTaskStatus({ id: id!, status }).unwrap();
      toast.success(`Task marked as ${status.replace(/_/g, ' ')}`);
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message;
      toast.error(msg || 'Failed to update task status');
    }
  };

  return (
    <>
      <Helmet><title>{task.title} | Task Detail</title></Helmet>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Back */}
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{cat?.icon}</span>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">{task.title}</h1>
                    <p className="text-sm text-gray-400">{cat?.name}</p>
                  </div>
                </div>
                <span className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full ${TASK_STATUS_STYLES[task.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {task.status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400" /> {new Date(task.scheduledAt).toLocaleString()}</div>
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" /> {task.address}</div>
                {task.estimatedHours && <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /> {task.estimatedHours}h estimated</div>}
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-bold text-gray-900 mb-3">Description</h2>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{task.description}</p>
            </div>

            {/* Photos */}
            {(() => {
              const realPhotos = task.photos.filter(u => !u.includes('placehold.co'));
              return realPhotos.length > 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h2 className="font-bold text-gray-900 mb-3">Photos</h2>
                  <div className="grid grid-cols-3 gap-3">
                    {realPhotos.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`Task photo ${i + 1}`}
                        className="w-full h-28 object-cover rounded-xl border border-gray-100"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Applications panel — client sees this when task is posted */}
            {isClient && isPosted && id && (
              <ApplicationsPanel taskId={id} estimatedHours={task.estimatedHours} />
            )}

            {/* Status timeline */}
            {task.status !== 'cancelled' && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="font-bold text-gray-900 mb-5">Progress</h2>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                  <div
                    className="absolute left-4 top-0 w-0.5 bg-primary-600 transition-all"
                    style={{ height: `${Math.max(0, (currentIdx / (TIMELINE.length - 1)) * 100)}%` }}
                  />
                  <div className="space-y-6">
                    {TIMELINE.map((item, i) => {
                      const done = i <= currentIdx;
                      return (
                        <div key={item.status} className="flex items-start gap-4 pl-10 relative">
                          <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 -translate-x-1/2 mt-0.5 ${done ? 'bg-primary-600 border-primary-600' : 'bg-white border-gray-300'}`} />
                          <div>
                            <p className={`text-sm font-semibold ${done ? 'text-gray-900' : 'text-gray-400'}`}>{item.label}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                          </div>
                          {done && i === currentIdx && (
                            <CheckCircle className="w-4 h-4 text-primary-600 mt-0.5" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Cancellation info */}
            {task.status === 'cancelled' && task.cancellationReason && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-700">Task Cancelled</p>
                    <p className="text-sm text-red-600 mt-1">{task.cancellationReason}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Review section — shown when completed and user is client */}
            {task.status === 'completed' && user?.role === 'client' && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400" /> Review
                </h2>
                {existingReview ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map((n) => (
                        <Star key={n} className={`w-5 h-5 ${n <= existingReview.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                      ))}
                    </div>
                    <p className="text-sm text-gray-700">{existingReview.comment}</p>
                    {existingReview.reply && (
                      <div className="bg-gray-50 rounded-xl p-3 mt-2">
                        <p className="text-xs font-semibold text-gray-500 mb-1">Tasker's reply</p>
                        <p className="text-sm text-gray-700">{existingReview.reply}</p>
                      </div>
                    )}
                    {!existingReview.isApproved && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Pending moderation
                      </p>
                    )}
                  </div>
                ) : showReviewForm ? (
                  <form onSubmit={handleSubmitReview} className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-2">How would you rate this task?</p>
                      <StarRating value={reviewRating} onChange={setReviewRating} />
                    </div>
                    <textarea
                      rows={3}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Share your experience with this tasker…"
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setShowReviewForm(false)} className="flex-1 border border-gray-300 rounded-xl py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                      <button type="submit" disabled={submittingReview || !reviewComment.trim()} className="flex-1 bg-primary-700 hover:bg-primary-800 disabled:opacity-50 text-white font-semibold py-2 rounded-xl text-sm">
                        {submittingReview ? 'Submitting…' : 'Submit Review'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <p className="text-sm text-gray-500 mb-3">Share your experience to help others find great taskers.</p>
                    <button onClick={() => setShowReviewForm(true)} className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-medium px-4 py-2.5 rounded-xl text-sm transition-colors">
                      <Star className="w-4 h-4" /> Leave a Review
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Pricing */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-bold text-gray-900 mb-3">Pricing</h3>
              <div className="space-y-2 text-sm">
                {task.price ? (
                  <>
                    <div className="flex justify-between"><span className="text-gray-500">Task total</span><span className="font-semibold">${task.price.toFixed(2)}</span></div>
                    {task.platformFee && <div className="flex justify-between"><span className="text-gray-500">Platform fee</span><span>${task.platformFee.toFixed(2)}</span></div>}
                    {task.taskerEarnings && <div className="flex justify-between"><span className="text-gray-500">Tasker earns</span><span>${task.taskerEarnings.toFixed(2)}</span></div>}
                  </>
                ) : (
                  <p className="text-gray-400">Pricing confirmed after tasker is selected</p>
                )}
              </div>
            </div>

            {/* Tasker apply panel — shown to taskers when task is posted */}
            {user?.role === 'tasker' && isPosted && id && (
              <TaskerApplyPanel taskId={id} />
            )}

            {/* Participant card — shown when assigned */}
            {tasker && !isPosted ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                {isTasker ? (
                  <>
                    <h3 className="font-bold text-gray-900 mb-3">Your Client</h3>
                    <div className="flex items-center gap-3 mb-4">
                      <img
                        src={client.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(client.name)}&background=1D4ED8&color=fff`}
                        alt={client.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-semibold text-gray-900">{client.name}</p>
                        <p className="text-xs text-gray-400">{client.email}</p>
                      </div>
                    </div>
                    <Link
                      to={`/chat?taskId=${id}`}
                      className="w-full flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-lg text-sm transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" /> Message Client
                    </Link>
                  </>
                ) : (
                  <>
                    <h3 className="font-bold text-gray-900 mb-3">Your Tasker</h3>
                    <div className="flex items-center gap-3 mb-4">
                      <img
                        src={tasker.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(tasker.name)}&background=1D4ED8&color=fff`}
                        alt={tasker.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-semibold text-gray-900">{tasker.name}</p>
                        <p className="text-xs text-gray-400">{tasker.email}</p>
                      </div>
                    </div>
                    <Link
                      to={`/chat?taskId=${id}`}
                      className="w-full flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-lg text-sm transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" /> Message Tasker
                    </Link>
                  </>
                )}
              </div>
            ) : !tasker && !isPosted ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
                <p className="text-sm text-gray-500">Waiting for a Tasker to be assigned.</p>
              </div>
            ) : null}

            {/* Status actions */}
            {canUpdateStatus && task.status === 'assigned' && (
              <button
                onClick={() => handleStatusUpdate('in_progress')}
                disabled={updatingStatus}
                className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                Start Task
              </button>
            )}

            {canUpdateStatus && task.status === 'in_progress' && (
              <button
                onClick={() => handleStatusUpdate('completed')}
                disabled={updatingStatus}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Mark as Complete
              </button>
            )}

            {/* Cancel task */}
            {canCancel && isClient && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="w-full flex items-center justify-center gap-2 border border-red-300 text-red-600 hover:bg-red-50 font-medium py-2.5 rounded-xl text-sm transition-colors"
              >
                <X className="w-4 h-4" /> Cancel Task
              </button>
            )}

            {/* Raise dispute */}
            {['assigned', 'in_progress'].includes(task.status) && tasker && (
              <Link
                to={`/tasks/${id}/dispute`}
                className="w-full flex items-center justify-center gap-2 border border-amber-300 text-amber-700 hover:bg-amber-50 font-medium py-2.5 rounded-xl text-sm transition-colors"
              >
                <ShieldAlert className="w-4 h-4" /> Raise a Dispute
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Cancel modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="font-bold text-gray-900 text-lg mb-2">Cancel this task?</h3>
            <p className="text-sm text-gray-500 mb-4">Please let us know why you're cancelling.</p>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation…"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowCancelModal(false)} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">Keep Task</button>
              <button
                onClick={handleCancel}
                disabled={cancelling || !cancelReason.trim()}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-semibold"
              >
                {cancelling ? 'Cancelling…' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
