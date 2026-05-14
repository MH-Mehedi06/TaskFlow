import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { AlertTriangle, ArrowLeft, Upload, X, Loader2, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetTaskByIdQuery } from '../features/tasks/taskApi';
import { useCreateDisputeMutation, useUploadEvidenceMutation } from '../features/disputes/disputeApi';
import { ICategory } from '../types';

const REASONS = [
  'Work not completed as described',
  'Tasker did not show up',
  'Poor quality of work',
  'Property damage',
  'Unauthorized charges',
  'Tasker was unprofessional',
  'Safety concern',
  'Other',
];

export default function DisputeForm() {
  const { id: taskId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: task, isLoading: loadingTask } = useGetTaskByIdQuery(taskId!);
  const [createDispute, { isLoading: submitting }] = useCreateDisputeMutation();
  const [uploadEvidence] = useUploadEvidenceMutation();

  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [step, setStep] = useState<1 | 2>(1);
  const [disputeId, setDisputeId] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []).slice(0, 5 - files.length);
    setFiles((prev) => [...prev, ...selected].slice(0, 5));
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || !description.trim()) { toast.error('Please fill all required fields'); return; }
    if (description.trim().length < 50) { toast.error('Please provide at least 50 characters of description'); return; }

    try {
      const dispute = await createDispute({ taskId: taskId!, reason, description }).unwrap();
      setDisputeId(dispute._id);

      if (files.length > 0) {
        setUploading(true);
        const fd = new FormData();
        files.forEach((f) => fd.append('files', f));
        await uploadEvidence({ id: dispute._id, formData: fd }).unwrap();
        setUploading(false);
      }

      toast.success('Dispute submitted successfully');
      navigate(`/disputes/${dispute._id}`);
    } catch (err: unknown) {
      setUploading(false);
      const msg = (err as { data?: { message?: string } })?.data?.message ?? 'Failed to submit dispute';
      toast.error(msg);
    }
  };

  const cat = task?.categoryId as ICategory | undefined;

  if (loadingTask) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
    </div>
  );

  if (!task) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Task not found.</p>
    </div>
  );

  return (
    <>
      <Helmet><title>Raise a Dispute | TaskFlow</title></Helmet>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link to={`/tasks/${taskId}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to task
        </Link>

        {/* Warning banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">Before raising a dispute</p>
            <p className="text-sm text-amber-700 mt-1">
              We recommend messaging your tasker first to try to resolve any issues. Disputes are reviewed by our team and may take 2–5 business days.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Raise a Dispute</h1>
              <p className="text-sm text-gray-500">
                {cat?.icon} {task.title}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Reason */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Reason for dispute *</label>
              <div className="grid grid-cols-2 gap-2">
                {REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-colors ${reason === r ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Describe the issue * <span className="font-normal text-gray-400">(minimum 50 characters)</span>
              </label>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please provide as much detail as possible about what happened…"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
              <p className={`text-xs mt-1 ${description.length < 50 ? 'text-gray-400' : 'text-green-600'}`}>
                {description.length} / 50 min characters
              </p>
            </div>

            {/* Evidence upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Evidence photos <span className="font-normal text-gray-400">(optional, up to 5)</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {files.map((f, i) => (
                  <div key={i} className="relative group">
                    <img src={URL.createObjectURL(f)} alt={f.name} className="w-20 h-20 object-cover rounded-xl border border-gray-200" />
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {files.length < 5 && (
                  <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary-400 text-gray-400 hover:text-primary-500 transition-colors">
                    <Upload className="w-5 h-5 mb-1" />
                    <span className="text-xs">Add</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileAdd} />
                  </label>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2 flex gap-3">
              <Link
                to={`/tasks/${taskId}`}
                className="flex-1 flex items-center justify-center border border-gray-300 rounded-xl py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting || uploading || !reason || description.trim().length < 50}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {(submitting || uploading) ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                {submitting ? 'Submitting…' : uploading ? 'Uploading evidence…' : 'Submit Dispute'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
