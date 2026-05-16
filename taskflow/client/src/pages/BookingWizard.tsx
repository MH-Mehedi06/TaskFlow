import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronLeft, ChevronRight, Check, Upload, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import {
  setStep, setCategory, setSubCategory, setTaskDetails, resetWizard,
} from '../features/tasks/taskSlice';
import { useCreateTaskMutation, useUploadTaskPhotosMutation } from '../features/tasks/taskApi';
import { useGetCategoriesQuery } from '../features/categories/categoryApi';
import { ICategory } from '../types';

const TOTAL = 5;
const STEP_LABELS = ['Category', 'Task Details', 'Photos', 'Schedule', 'Review'];

// ─── Step components ────────────────────────────────────────────────────────

function Step1Category() {
  const dispatch = useAppDispatch();
  const wizard = useAppSelector((s) => s.taskWizard);
  const { data: categories = [], isLoading } = useGetCategoriesQuery();

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary-700" /></div>;

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">What do you need help with?</h2>
      <p className="text-sm text-gray-500 mb-6">Pick a category to get started.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {categories.map((cat: ICategory) => (
          <button
            key={cat._id}
            onClick={() => dispatch(setCategory({ categoryId: cat._id, category: cat }))}
            className={`p-4 rounded-xl border-2 text-left transition-all ${wizard.categoryId === cat._id ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <span className="text-2xl">{cat.icon}</span>
            <p className="mt-2 text-sm font-semibold text-gray-800">{cat.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">From ${cat.startingPrice}/hr</p>
          </button>
        ))}
      </div>

      {wizard.category?.children && wizard.category.children.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">Narrow it down (optional):</p>
          <div className="flex flex-wrap gap-2">
            {wizard.category.children.map((sub: ICategory) => (
              <button
                key={sub._id}
                onClick={() => dispatch(setSubCategory(sub._id))}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${wizard.subCategoryId === sub._id ? 'bg-primary-700 text-white border-primary-700' : 'border-gray-300 text-gray-600 hover:border-primary-400'}`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Step2Details() {
  const dispatch = useAppDispatch();
  const wizard = useAppSelector((s) => s.taskWizard);

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Describe your task</h2>
      <p className="text-sm text-gray-500 mb-4">Give Taskers the details they need to apply.</p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Task title</label>
        <input
          type="text"
          value={wizard.title}
          onChange={(e) => dispatch(setTaskDetails({ title: e.target.value }))}
          placeholder={`e.g. ${wizard.category?.name ?? 'Task'} at my home`}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          rows={5}
          value={wizard.description}
          onChange={(e) => dispatch(setTaskDetails({ description: e.target.value }))}
          placeholder="Describe what needs to be done, any special requirements, access instructions, etc."
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Estimated hours</label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={8}
            step={0.5}
            value={wizard.estimatedHours}
            onChange={(e) => dispatch(setTaskDetails({ estimatedHours: Number(e.target.value) }))}
            className="flex-1 accent-primary-700"
          />
          <span className="w-16 text-center font-semibold text-gray-800">{wizard.estimatedHours}h</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Additional notes (optional)</label>
        <textarea
          rows={2}
          value={wizard.notes}
          onChange={(e) => dispatch(setTaskDetails({ notes: e.target.value }))}
          placeholder="Gate code, parking info, pet warnings…"
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        />
      </div>
    </div>
  );
}

function Step3Photos({ files, setFiles }: { files: File[]; setFiles: (f: File[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files ?? []).slice(0, 5 - files.length);
    setFiles([...files, ...newFiles]);
  };

  const remove = (i: number) => setFiles(files.filter((_, idx) => idx !== i));

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Add photos</h2>
      <p className="text-sm text-gray-500 mb-6">Help Taskers understand the job. Up to 5 photos.</p>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {files.map((f, i) => (
          <div key={i} className="relative group">
            <img src={URL.createObjectURL(f)} alt="" className="w-full h-24 object-cover rounded-xl border border-gray-200" />
            <button
              onClick={() => remove(i)}
              className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {files.length < 5 && (
          <button
            onClick={() => fileRef.current?.click()}
            className="h-24 rounded-xl border-2 border-dashed border-gray-300 hover:border-primary-400 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-primary-600 transition-colors"
          >
            <Upload className="w-5 h-5" />
            <span className="text-xs">Add photo</span>
          </button>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAdd} />
      <p className="text-xs text-gray-400">
        {files.length}/5 photos · Photos can be skipped
      </p>
    </div>
  );
}

function Step4Schedule() {
  const dispatch = useAppDispatch();
  const wizard = useAppSelector((s) => s.taskWizard);

  const minDate = new Date();
  minDate.setHours(minDate.getHours() + 1);
  const minDateStr = minDate.toISOString().slice(0, 16);

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900 mb-1">When and where?</h2>
      <p className="text-sm text-gray-500 mb-4">Set the location and preferred date/time.</p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
        <input
          type="text"
          value={wizard.address}
          onChange={(e) => dispatch(setTaskDetails({ address: e.target.value }))}
          placeholder="123 Main St, City, State ZIP"
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Preferred date & time</label>
        <input
          type="datetime-local"
          min={minDateStr}
          value={wizard.scheduledAt}
          onChange={(e) => dispatch(setTaskDetails({ scheduledAt: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        <strong>Tip:</strong> Scheduling at least 24 hours ahead gives Taskers more time to prepare.
      </div>
    </div>
  );
}

function Step5Review({ files }: { files: File[] }) {
  const wizard = useAppSelector((s) => s.taskWizard);

  const row = (label: string, value: string) => (
    <div key={label} className="flex gap-3 py-3 border-b border-gray-100 last:border-0">
      <span className="w-32 flex-shrink-0 text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-800 break-words">{value}</span>
    </div>
  );

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Review your task</h2>
      <p className="text-sm text-gray-500 mb-6">Double-check everything before posting to Taskers.</p>

      <div className="bg-gray-50 rounded-xl p-5 mb-4">
        {row('Service', `${wizard.category?.icon ?? ''} ${wizard.category?.name ?? '—'}`)}
        {row('Title', wizard.title || '—')}
        {row('Description', wizard.description || '—')}
        {row('Location', wizard.address || '—')}
        {row('Scheduled', wizard.scheduledAt ? new Date(wizard.scheduledAt).toLocaleString() : '—')}
        {row('Est. hours', `${wizard.estimatedHours}h`)}
        {wizard.notes && row('Notes', wizard.notes)}
      </div>

      {files.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">{files.length} photo{files.length > 1 ? 's' : ''} attached</p>
          <div className="flex gap-2">
            {files.map((f, i) => (
              <img key={i} src={URL.createObjectURL(f)} alt="" className="w-14 h-14 object-cover rounded-lg border border-gray-200" />
            ))}
          </div>
        </div>
      )}

      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
        <strong>How it works:</strong> After posting, Taskers will apply with their rates and cover letters. You review applications and choose the best fit.
      </div>
    </div>
  );
}

// ─── Main wizard ─────────────────────────────────────────────────────────────

export default function BookingWizard() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const wizard = useAppSelector((s) => s.taskWizard);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  const [createTask, { isLoading: creating }] = useCreateTaskMutation();
  const [uploadPhotos, { isLoading: uploading }] = useUploadTaskPhotosMutation();

  const isBusy = creating || uploading;

  const canNext = () => {
    if (wizard.step === 1) return !!wizard.categoryId;
    if (wizard.step === 2) return !!(wizard.title.trim() && wizard.description.trim());
    if (wizard.step === 4) return !!(wizard.address.trim() && wizard.scheduledAt);
    return true;
  };

  const handleNext = () => {
    if (wizard.step < TOTAL) dispatch(setStep(wizard.step + 1));
  };

  const handleBack = () => {
    if (wizard.step > 1) dispatch(setStep(wizard.step - 1));
  };

  const handleConfirm = async () => {
    try {
      const body: Record<string, unknown> = {
        categoryId: wizard.categoryId,
        title: wizard.title,
        description: wizard.description,
        address: wizard.address,
        scheduledAt: wizard.scheduledAt,
        estimatedHours: wizard.estimatedHours,
      };

      if (wizard.notes?.trim()) body.notes = wizard.notes.trim();

      const task = await createTask(body as Parameters<typeof createTask>[0]).unwrap();

      if (photoFiles.length > 0) {
        try {
          const fd = new FormData();
          photoFiles.forEach((f) => fd.append('photos', f));
          await uploadPhotos({ id: task._id, formData: fd }).unwrap();
        } catch {
          toast('Photos could not be uploaded — task was still created.', { icon: '⚠️' });
        }
      }

      toast.success('Task posted! Taskers can now apply.');
      dispatch(resetWizard());
      navigate(`/tasks/${task._id}`);
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message;
      toast.error(msg ?? 'Posting failed. Please try again.');
    }
  };

  return (
    <>
      <Helmet><title>Post a Task | TaskFlow</title></Helmet>

      <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{STEP_LABELS[wizard.step - 1]}</span>
              <span className="text-sm text-gray-400">Step {wizard.step} of {TOTAL}</span>
            </div>
            <div className="flex gap-1">
              {STEP_LABELS.map((_, i) => (
                <div key={i} className={`flex-1 h-1.5 rounded-full ${i < wizard.step ? 'bg-primary-700' : 'bg-gray-200'}`} />
              ))}
            </div>
            {/* Step dots */}
            <div className="flex justify-between mt-2">
              {STEP_LABELS.map((label, i) => (
                <div key={label} className="flex flex-col items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i + 1 < wizard.step ? 'bg-primary-700 text-white' : i + 1 === wizard.step ? 'bg-primary-700 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {i + 1 < wizard.step ? <Check className="w-3 h-3" /> : i + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            {wizard.step === 1 && <Step1Category />}
            {wizard.step === 2 && <Step2Details />}
            {wizard.step === 3 && <Step3Photos files={photoFiles} setFiles={setPhotoFiles} />}
            {wizard.step === 4 && <Step4Schedule />}
            {wizard.step === 5 && <Step5Review files={photoFiles} />}

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-100">
              {wizard.step > 1 ? (
                <button onClick={handleBack} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              ) : (
                <div />
              )}

              {wizard.step < TOTAL ? (
                <button
                  onClick={handleNext}
                  disabled={!canNext()}
                  className="flex items-center gap-2 bg-primary-700 hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleConfirm}
                  disabled={isBusy || !canNext()}
                  className="flex items-center gap-2 bg-primary-700 hover:bg-primary-800 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
                >
                  {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {isBusy ? 'Posting…' : 'Post Task'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
