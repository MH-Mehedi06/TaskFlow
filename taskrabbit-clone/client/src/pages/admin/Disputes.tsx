import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { AlertTriangle, Loader2, ChevronLeft, ChevronRight, ExternalLink, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useGetAllDisputesQuery, useResolveDisputeMutation } from '../../features/admin/adminApi';
import { IDispute, IUser, ITask } from '../../types';

const DISPUTE_STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-100 text-red-700',
  under_review: 'bg-amber-100 text-amber-700',
  resolved_refund: 'bg-green-100 text-green-700',
  resolved_release: 'bg-purple-100 text-purple-700',
  closed: 'bg-gray-100 text-gray-500',
};

interface ResolveForm {
  status: string;
  resolution: string;
  adminNotes: string;
  refundAmount: string;
}

function ResolvePanel({ dispute, onDone }: { dispute: IDispute; onDone: () => void }) {
  const [form, setForm] = useState<ResolveForm>({
    status: dispute.status === 'open' ? 'under_review' : dispute.status,
    resolution: (dispute as IDispute & { resolution?: string }).resolution ?? '',
    adminNotes: (dispute as IDispute & { adminNotes?: string }).adminNotes ?? '',
    refundAmount: String((dispute as IDispute & { refundAmount?: number }).refundAmount ?? ''),
  });
  const [resolve, { isLoading }] = useResolveDisputeMutation();

  const set = (k: keyof ResolveForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await resolve({
        id: dispute._id,
        status: form.status,
        adminNotes: form.adminNotes || undefined,
        resolution: form.resolution || undefined,
        refundAmount: form.refundAmount ? parseFloat(form.refundAmount) : undefined,
      }).unwrap();
      toast.success('Dispute updated');
      onDone();
    } catch { toast.error('Failed to update dispute'); }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 border-t border-gray-100 pt-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
          <select value={form.status} onChange={(e) => set('status', e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            {['under_review','resolved_refund','resolved_release','closed'].map((s) => (
              <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Resolution</label>
          <select value={form.resolution} onChange={(e) => set('resolution', e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">None</option>
            <option value="full_refund">Full refund</option>
            <option value="partial_refund">Partial refund</option>
            <option value="no_refund">No refund</option>
          </select>
        </div>
      </div>
      {form.resolution === 'partial_refund' && (
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Refund amount ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.refundAmount}
            onChange={(e) => set('refundAmount', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="0.00"
          />
        </div>
      )}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Admin notes</label>
        <textarea
          value={form.adminNotes}
          onChange={(e) => set('adminNotes', e.target.value)}
          rows={2}
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          placeholder="Internal notes about this decision…"
        />
      </div>
      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={onDone} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary-700 hover:bg-primary-800 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Save resolution
        </button>
      </div>
    </form>
  );
}

export default function Disputes() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useGetAllDisputesQuery({ page, status: status || undefined });
  const disputes = data?.disputes ?? [];

  const toggle = (id: string) => setExpanded((cur) => (cur === id ? null : id));

  return (
    <>
      <Helmet><title>Disputes | Admin</title></Helmet>
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Disputes</h2>
          <p className="text-sm text-gray-500 mt-0.5">Review and resolve platform disputes</p>
        </div>

        <div className="flex gap-3">
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
          >
            <option value="">All statuses</option>
            {['open','under_review','resolved_refund','resolved_release','closed'].map((s) => (
              <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>
        ) : disputes.length === 0 ? (
          <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-200">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No disputes found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {disputes.map((d: IDispute) => {
              const client = d.clientId as unknown as IUser | undefined;
              const tasker = d.taskerId as unknown as IUser | undefined;
              const task = d.taskId as ITask | undefined;
              const isOpen = expanded === d._id;
              return (
                <div key={d._id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors">
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{d.reason}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Task: <span className="text-gray-600 font-medium">{typeof task !== 'string' ? task?.title : '—'}</span>
                        </p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${DISPUTE_STATUS_COLORS[d.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {d.status.replace(/_/g,' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">{d.description}</p>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>Client: <strong className="text-gray-700">{client?.name ?? '—'}</strong></span>
                        <span className="text-gray-300">•</span>
                        <span>Tasker: <strong className="text-gray-700">{tasker?.name ?? '—'}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/disputes/${d._id}`}
                          className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium transition-colors"
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </Link>
                        <button
                          onClick={() => toggle(d._id)}
                          className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${isOpen ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600 hover:bg-primary-50 hover:text-primary-700'}`}
                        >
                          Resolve {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="px-5 pb-5">
                      <ResolvePanel dispute={d} onDone={() => setExpanded(null)} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

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
