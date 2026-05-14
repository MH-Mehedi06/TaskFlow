import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ShieldAlert, Clock, CheckCircle, AlertTriangle, Loader2, FileImage, Gavel } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetDisputeByIdQuery, useUpdateDisputeStatusMutation, useResolveDisputeMutation } from '../features/disputes/disputeApi';
import { useAppSelector } from '../app/hooks';
import { ITask, IUser } from '../types';

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  open: { label: 'Open', color: 'bg-blue-100 text-blue-700', icon: <Clock className="w-4 h-4" /> },
  under_review: { label: 'Under Review', color: 'bg-amber-100 text-amber-700', icon: <ShieldAlert className="w-4 h-4" /> },
  resolved_refund: { label: 'Resolved — Refund', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-4 h-4" /> },
  resolved_release: { label: 'Resolved — Released', color: 'bg-purple-100 text-purple-700', icon: <CheckCircle className="w-4 h-4" /> },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-600', icon: <CheckCircle className="w-4 h-4" /> },
};

const TIMELINE = [
  { status: 'open', label: 'Dispute raised', desc: 'Our team has been notified' },
  { status: 'under_review', label: 'Under review', desc: 'Admin is reviewing your case' },
  { status: 'resolved_refund', label: 'Resolved', desc: 'Decision has been made' },
];

function UserBadge({ user, label }: { user: IUser | string | undefined; label: string }) {
  const u = user as IUser | undefined;
  if (!u || typeof u === 'string') return null;
  return (
    <div className="flex items-center gap-3">
      {u.avatar ? (
        <img src={u.avatar} alt={u.name} className="w-9 h-9 rounded-full object-cover" />
      ) : (
        <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 text-sm font-bold flex items-center justify-center">
          {u.name?.charAt(0)}
        </div>
      )}
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800">{u.name}</p>
      </div>
    </div>
  );
}

export default function DisputeDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAppSelector((s) => s.auth);
  const isAdmin = user?.role === 'admin';

  const { data: dispute, isLoading } = useGetDisputeByIdQuery(id!);
  const [updateStatus, { isLoading: updatingStatus }] = useUpdateDisputeStatusMutation();
  const [resolveDisp, { isLoading: resolving }] = useResolveDisputeMutation();

  const [adminNotes, setAdminNotes] = useState('');
  const [resolution, setResolution] = useState('no_refund');
  const [refundAmount, setRefundAmount] = useState('');
  const [showResolvePanel, setShowResolvePanel] = useState(false);

  const handleStatusUpdate = async (status: string) => {
    try {
      await updateStatus({ id: id!, status, adminNotes: adminNotes || undefined }).unwrap();
      toast.success(`Status updated to: ${status.replace(/_/g, ' ')}`);
    } catch { toast.error('Failed to update status'); }
  };

  const handleResolve = async () => {
    try {
      await resolveDisp({
        id: id!,
        resolution,
        refundAmount: refundAmount ? parseFloat(refundAmount) : undefined,
        adminNotes: adminNotes || undefined,
      }).unwrap();
      toast.success('Dispute resolved');
      setShowResolvePanel(false);
    } catch { toast.error('Failed to resolve dispute'); }
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
    </div>
  );

  if (!dispute) return (
    <div className="min-h-screen flex items-center justify-center text-gray-500">
      Dispute not found.
    </div>
  );

  const meta = STATUS_META[dispute.status] ?? STATUS_META.open;
  const task = dispute.taskId as ITask | undefined;
  const isResolved = ['resolved_refund', 'resolved_release', 'closed'].includes(dispute.status);
  const timelineIdx = dispute.status === 'open' ? 0 : dispute.status === 'under_review' ? 1 : 2;

  return (
    <>
      <Helmet><title>Dispute #{id?.slice(-6)} | TaskFlow</title></Helmet>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main */}
          <div className="lg:col-span-2 space-y-5">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h1 className="font-bold text-gray-900">Dispute #{id?.slice(-6).toUpperCase()}</h1>
                    {task && <p className="text-sm text-gray-500">{task.title}</p>}
                  </div>
                </div>
                <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${meta.color}`}>
                  {meta.icon} {meta.label}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Reason</p>
                  <p className="text-sm font-medium text-gray-800">{dispute.reason}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Description</p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{dispute.description}</p>
                </div>
                <p className="text-xs text-gray-400">Submitted {new Date(dispute.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Evidence */}
            {dispute.evidence.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileImage className="w-4 h-4" /> Evidence ({dispute.evidence.length})
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  {dispute.evidence.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt={`Evidence ${i + 1}`} className="w-full h-24 object-cover rounded-xl border border-gray-200 hover:opacity-90 transition-opacity" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* AI Summary (if available) */}
            {dispute.aiSummary && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">AI Case Summary</p>
                <p className="text-sm text-gray-700 leading-relaxed">{dispute.aiSummary}</p>
                {dispute.aiSuggestedResolution && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Suggested Resolution</p>
                    <p className="text-sm text-gray-700">{dispute.aiSuggestedResolution}</p>
                  </div>
                )}
              </div>
            )}

            {/* Resolution */}
            {isResolved && (
              <div className={`rounded-2xl border p-6 ${dispute.status === 'resolved_refund' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <h2 className="font-bold text-gray-900 mb-3">Resolution</h2>
                <p className="text-sm text-gray-700 mb-2">
                  <span className="font-medium">Decision: </span>
                  {dispute.resolution === 'full_refund' && '✅ Full refund issued'}
                  {dispute.resolution === 'partial_refund' && `✅ Partial refund of $${dispute.refundAmount?.toFixed(2)} issued`}
                  {dispute.resolution === 'no_refund' && '⚡ Payment released to tasker'}
                </p>
                {dispute.adminNotes && (
                  <p className="text-sm text-gray-600"><span className="font-medium">Admin notes: </span>{dispute.adminNotes}</p>
                )}
              </div>
            )}

            {/* Admin notes (open/under review) */}
            {!isResolved && dispute.adminNotes && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <div className="flex gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <p className="text-sm font-semibold text-amber-700">Note from admin</p>
                </div>
                <p className="text-sm text-amber-700">{dispute.adminNotes}</p>
              </div>
            )}

            {/* Admin action panel */}
            {isAdmin && !isResolved && (
              <div className="bg-white rounded-2xl border-2 border-primary-200 p-6 space-y-5">
                <div className="flex items-center gap-2">
                  <Gavel className="w-5 h-5 text-primary-600" />
                  <h2 className="font-bold text-gray-900">Admin Controls</h2>
                </div>

                {/* Status actions */}
                {dispute.status === 'open' && (
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Change Status</p>
                    <button
                      onClick={() => handleStatusUpdate('under_review')}
                      disabled={updatingStatus}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors disabled:opacity-50"
                    >
                      {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                      Mark Under Review
                    </button>
                  </div>
                )}

                {/* Admin notes */}
                <div>
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1 block">Admin Notes (visible to parties)</label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                    placeholder="Add a note visible to both client and tasker…"
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                  />
                </div>

                {/* Resolve toggle */}
                {!showResolvePanel ? (
                  <button
                    onClick={() => setShowResolvePanel(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
                  >
                    <Gavel className="w-4 h-4" /> Resolve Dispute
                  </button>
                ) : (
                  <div className="space-y-4 border border-gray-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-gray-800">Resolution Decision</p>

                    <div className="space-y-2">
                      {[
                        { value: 'no_refund', label: 'Release payment to tasker', color: 'border-purple-300 bg-purple-50 text-purple-700' },
                        { value: 'partial_refund', label: 'Partial refund to client', color: 'border-yellow-300 bg-yellow-50 text-yellow-700' },
                        { value: 'full_refund', label: 'Full refund to client', color: 'border-green-300 bg-green-50 text-green-700' },
                      ].map((opt) => (
                        <label
                          key={opt.value}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${resolution === opt.value ? opt.color : 'border-gray-200 bg-white'}`}
                        >
                          <input
                            type="radio"
                            name="resolution"
                            value={opt.value}
                            checked={resolution === opt.value}
                            onChange={() => setResolution(opt.value)}
                            className="accent-primary-600"
                          />
                          <span className="text-sm font-medium">{opt.label}</span>
                        </label>
                      ))}
                    </div>

                    {resolution === 'partial_refund' && (
                      <div>
                        <label className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1 block">Refund Amount ($)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={refundAmount}
                          onChange={(e) => setRefundAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                        />
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowResolvePanel(false)}
                        className="flex-1 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleResolve}
                        disabled={resolving || (resolution === 'partial_refund' && !refundAmount)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50"
                      >
                        {resolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Confirm
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Timeline */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-bold text-gray-900 text-sm mb-4">Progress</h3>
              <div className="space-y-4">
                {TIMELINE.map((t, i) => {
                  const done = i <= timelineIdx;
                  const active = i === timelineIdx;
                  return (
                    <div key={t.status} className="flex items-start gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-primary-600' : 'bg-gray-100'}`}>
                        {done ? <CheckCircle className="w-4 h-4 text-white" /> : <div className="w-2 h-2 rounded-full bg-gray-300" />}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${active ? 'text-primary-700' : done ? 'text-gray-900' : 'text-gray-400'}`}>{t.label}</p>
                        <p className="text-xs text-gray-400">{t.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Parties */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <h3 className="font-bold text-gray-900 text-sm">Parties</h3>
              <UserBadge user={dispute.clientId as unknown as IUser} label="Client" />
              <UserBadge user={dispute.taskerId as unknown as IUser} label="Tasker" />
            </div>

            {/* Link to task */}
            {task && (
              <Link
                to={`/tasks/${task._id}`}
                className="block w-full text-center text-sm text-primary-600 hover:underline border border-primary-200 rounded-xl py-2.5 hover:bg-primary-50 transition-colors"
              >
                View original task
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
