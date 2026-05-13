import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Calendar, MapPin, Clock, AlertCircle, MessageSquare, X, Loader2, CheckCircle, Star, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetTaskByIdQuery, useCancelTaskMutation } from '../../features/tasks/taskApi';
import { useGetReviewByTaskQuery, useCreateReviewMutation } from '../../features/reviews/reviewApi';
import { useAppSelector } from '../../app/hooks';
import { IUser, ICategory, ITaskerProfile } from '../../types';

const STATUS_STYLES: Record<string, string> = {
  posted: 'bg-blue-100 text-blue-700',
  assigned: 'bg-indigo-100 text-indigo-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
};

const TIMELINE: { status: string; label: string; desc: string }[] = [
  { status: 'posted', label: 'Task Posted', desc: 'Looking for a Tasker' },
  { status: 'assigned', label: 'Tasker Assigned', desc: 'Tasker has accepted' },
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

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth);
  const { data: task, isLoading, isError } = useGetTaskByIdQuery(id!);
  const { data: existingReview } = useGetReviewByTaskQuery(id!, { skip: !id });
  const [cancelTask, { isLoading: cancelling }] = useCancelTaskMutation();
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
                <span className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full ${STATUS_STYLES[task.status] ?? 'bg-gray-100 text-gray-600'}`}>
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
                  <p className="text-gray-400">Pricing to be confirmed</p>
                )}
              </div>
            </div>

            {/* Tasker card */}
            {tasker ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
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
                  to={`/chat?userId=${tasker._id}`}
                  className="w-full flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-lg text-sm transition-colors"
                >
                  <MessageSquare className="w-4 h-4" /> Message Tasker
                </Link>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
                <p className="text-sm text-gray-500">Waiting for a Tasker to accept your task.</p>
              </div>
            )}

            {/* Actions */}
            {canCancel && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="w-full flex items-center justify-center gap-2 border border-red-300 text-red-600 hover:bg-red-50 font-medium py-2.5 rounded-xl text-sm transition-colors"
              >
                <X className="w-4 h-4" /> Cancel Task
              </button>
            )}

            {/* Raise dispute — available on in-progress / assigned tasks */}
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
