import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CheckCircle, ChevronRight, ChevronLeft, Upload, Loader2, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetCategoriesQuery } from '../features/categories/categoryApi';
import { useUpdateProfileMutation, useUpdateAvailabilityMutation } from '../features/taskers/taskerApi';
import { updateUser } from '../features/auth/authSlice';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { ICategory } from '../types';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_SLOTS = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];

type AvailabilitySlot = { day: number; slots: { start: string; end: string }[] };
type HourlyRate = { categoryId: string; rate: number };

interface WizardData {
  headline: string;
  bio: string;
  skills: string[];
  hourlyRates: HourlyRate[];
  serviceRadius: number;
  availability: AvailabilitySlot[];
  avatarFile: File | null;
  avatarPreview: string;
}

const TOTAL_STEPS = 6;

const STEP_LABELS = [
  'Welcome',
  'Your Story',
  'Services & Rates',
  'Service Area',
  'Availability',
  'Profile Photo',
];

export default function TaskerOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>({
    headline: '',
    bio: '',
    skills: [],
    hourlyRates: [],
    serviceRadius: 25,
    availability: [],
    avatarFile: null,
    avatarPreview: '',
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const dispatch = useAppDispatch();
  const { accessToken } = useAppSelector((s) => s.auth);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const { data: categories = [] } = useGetCategoriesQuery();
  const [updateProfile, { isLoading: savingProfile }] = useUpdateProfileMutation();
  const [updateAvailability, { isLoading: savingAvail }] = useUpdateAvailabilityMutation();

  const isSaving = savingProfile || savingAvail || uploadingAvatar;

  const toggleSkill = (catId: string) => {
    setData((prev) => {
      const has = prev.skills.includes(catId);
      return {
        ...prev,
        skills: has ? prev.skills.filter((s) => s !== catId) : [...prev.skills, catId],
        hourlyRates: has
          ? prev.hourlyRates.filter((r) => r.categoryId !== catId)
          : [...prev.hourlyRates, { categoryId: catId, rate: 45 }],
      };
    });
  };

  const setRate = (catId: string, rate: number) => {
    setData((prev) => ({
      ...prev,
      hourlyRates: prev.hourlyRates.map((r) => r.categoryId === catId ? { ...r, rate } : r),
    }));
  };

  const toggleDay = (day: number) => {
    setData((prev) => {
      const exists = prev.availability.find((a) => a.day === day);
      return {
        ...prev,
        availability: exists
          ? prev.availability.filter((a) => a.day !== day)
          : [...prev.availability, { day, slots: [{ start: '09:00', end: '17:00' }] }],
      };
    });
  };

  const updateSlot = (day: number, field: 'start' | 'end', value: string) => {
    setData((prev) => ({
      ...prev,
      availability: prev.availability.map((a) =>
        a.day === day ? { ...a, slots: [{ ...a.slots[0], [field]: value }] } : a
      ),
    }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB');
      e.target.value = '';
      return;
    }
    setData((prev) => ({
      ...prev,
      avatarFile: file,
      avatarPreview: URL.createObjectURL(file),
    }));
  };

  const canProceed = () => {
    if (step === 3 && data.skills.length === 0) return false;
    return true;
  };

  const handleFinish = async () => {
    // Step 1: Save profile
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await updateProfile({
        headline: data.headline,
        bio: data.bio,
        skills: data.skills as any,
        hourlyRates: data.hourlyRates,
        serviceRadius: data.serviceRadius,
      }).unwrap();
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message;
      toast.error(`Profile save failed: ${msg || 'Server error'}`);
      return;
    }

    // Step 2: Save availability
    try {
      await updateAvailability({ availability: data.availability }).unwrap();
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message;
      toast.error(`Availability save failed: ${msg || 'Server error'}`);
      return;
    }

    // Step 3: Upload avatar via direct fetch (optional — don't block setup if it fails)
    if (data.avatarFile) {
      setUploadingAvatar(true);
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = () => reject(new Error('Could not read image file'));
          reader.readAsDataURL(data.avatarFile!);
        });

        const res = await fetch('/api/taskers/me/avatar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ base64, mimeType: data.avatarFile.type }),
        });

        const json = await res.json().catch(() => ({}));
        if (res.ok) {
          const avatarUrl: string | undefined = json?.data?.avatar;
          if (avatarUrl) dispatch(updateUser({ avatar: avatarUrl }));
        } else {
          toast.error(`Photo upload failed: ${json?.message || res.statusText} — continuing anyway`);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Network error';
        toast.error(`Photo upload failed: ${msg} — continuing anyway`);
      } finally {
        setUploadingAvatar(false);
      }
    }

    toast.success('Profile set up! Welcome aboard.');
    navigate('/tasker/dashboard');
  };

  return (
    <>
      <Helmet><title>Tasker Onboarding | TaskFlow</title></Helmet>

      <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{STEP_LABELS[step - 1]}</span>
              <span className="text-sm text-gray-400">Step {step} of {TOTAL_STEPS}</span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-1.5 rounded-full transition-all ${i < step ? 'bg-primary-700' : 'bg-gray-200'}`}
                />
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            {/* Step 1: Welcome */}
            {step === 1 && (
              <div className="text-center py-4">
                <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-6">
                  <Star className="w-10 h-10 text-primary-700" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Welcome to TaskFlow!</h2>
                <p className="text-gray-500 leading-relaxed mb-6 max-w-md mx-auto">
                  Let's set up your Tasker profile in a few quick steps. This is what clients will see when they browse for help.
                </p>
                <ul className="text-left space-y-3 mb-8 max-w-xs mx-auto">
                  {STEP_LABELS.slice(1).map((label, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-primary-600 flex-shrink-0" />
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Step 2: Your Story */}
            {step === 2 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Tell clients about yourself</h2>
                <p className="text-sm text-gray-500 mb-6">A great headline and bio boost your bookings.</p>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Headline <span className="text-gray-400 font-normal">(max 100 chars)</span>
                    </label>
                    <input
                      type="text"
                      maxLength={100}
                      value={data.headline}
                      onChange={(e) => setData((p) => ({ ...p, headline: e.target.value }))}
                      placeholder="e.g. Reliable handyman with 5 years experience"
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <p className="text-right text-xs text-gray-400 mt-1">{data.headline.length}/100</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bio <span className="text-gray-400 font-normal">(max 1000 chars)</span>
                    </label>
                    <textarea
                      maxLength={1000}
                      rows={5}
                      value={data.bio}
                      onChange={(e) => setData((p) => ({ ...p, bio: e.target.value }))}
                      placeholder="Tell clients what you do, your experience, and why you're the best choice…"
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    />
                    <p className="text-right text-xs text-gray-400">{data.bio.length}/1000</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Skills & Rates */}
            {step === 3 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Select your services</h2>
                <p className="text-sm text-gray-500 mb-6">Pick what you do and set your hourly rate. Select at least one.</p>

                <div className="space-y-3">
                  {categories.map((cat: ICategory) => {
                    const selected = data.skills.includes(cat._id);
                    const rate = data.hourlyRates.find((r) => r.categoryId === cat._id)?.rate ?? 45;
                    return (
                      <div
                        key={cat._id}
                        className={`border rounded-xl p-4 transition-colors ${selected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => toggleSkill(cat._id)}
                            className="flex items-center gap-3 flex-1 text-left"
                          >
                            <div className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 ${selected ? 'bg-primary-700 border-primary-700' : 'border-gray-300'}`}>
                              {selected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <span className="text-lg">{cat.icon}</span>
                            <span className="font-medium text-gray-800">{cat.name}</span>
                          </button>

                          {selected && (
                            <div className="flex items-center gap-1.5 ml-3">
                              <span className="text-sm text-gray-500">$</span>
                              <input
                                type="number"
                                min={10}
                                max={500}
                                value={rate}
                                onChange={(e) => setRate(cat._id, Number(e.target.value))}
                                className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
                              />
                              <span className="text-sm text-gray-500">/hr</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {data.skills.length === 0 && (
                  <p className="mt-3 text-xs text-red-500">Please select at least one service to continue.</p>
                )}
              </div>
            )}

            {/* Step 4: Service Radius */}
            {step === 4 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">How far will you travel?</h2>
                <p className="text-sm text-gray-500 mb-8">Clients within this radius will be able to find you.</p>

                <div className="text-center mb-6">
                  <span className="text-5xl font-extrabold text-primary-700">{data.serviceRadius}</span>
                  <span className="text-xl text-gray-500 ml-2">miles</span>
                </div>

                <input
                  type="range"
                  min={5}
                  max={60}
                  step={5}
                  value={data.serviceRadius}
                  onChange={(e) => setData((p) => ({ ...p, serviceRadius: Number(e.target.value) }))}
                  className="w-full accent-primary-700"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>5 mi</span>
                  <span>60 mi</span>
                </div>

                <div className="mt-8 grid grid-cols-3 gap-3">
                  {[10, 25, 50].map((r) => (
                    <button
                      key={r}
                      onClick={() => setData((p) => ({ ...p, serviceRadius: r }))}
                      className={`py-2 rounded-lg border text-sm font-medium transition-colors ${data.serviceRadius === r ? 'bg-primary-700 text-white border-primary-700' : 'border-gray-300 text-gray-600 hover:border-primary-400'}`}
                    >
                      {r} miles
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5: Availability */}
            {step === 5 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Set your availability</h2>
                <p className="text-sm text-gray-500 mb-6">Toggle the days you're available and set your hours.</p>

                <div className="space-y-3">
                  {DAYS.map((day, i) => {
                    const slot = data.availability.find((a) => a.day === i);
                    const active = !!slot;
                    return (
                      <div key={day} className={`border rounded-xl p-4 transition-colors ${active ? 'border-primary-400 bg-primary-50' : 'border-gray-200'}`}>
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={() => toggleDay(i)}
                            className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${active ? 'bg-primary-700' : 'bg-gray-300'}`}
                          >
                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                          </button>
                          <span className="text-sm font-medium text-gray-800 w-24">{day}</span>

                          {active && slot && (
                            <div className="flex items-center gap-2 flex-1">
                              <select
                                value={slot.slots[0]?.start || '09:00'}
                                onChange={(e) => updateSlot(i, 'start', e.target.value)}
                                className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                              >
                                {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                              </select>
                              <span className="text-gray-400 text-sm">to</span>
                              <select
                                value={slot.slots[0]?.end || '17:00'}
                                onChange={(e) => updateSlot(i, 'end', e.target.value)}
                                className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                              >
                                {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 6: Profile Photo */}
            {step === 6 && (
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900 mb-1">Add a profile photo</h2>
                <p className="text-sm text-gray-500 mb-8">Taskers with photos get 3× more bookings. You can skip this for now.</p>

                <div className="mb-6">
                  {data.avatarPreview ? (
                    <img
                      src={data.avatarPreview}
                      alt="Preview"
                      className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-primary-200"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center mx-auto">
                      <Upload className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-2 border border-gray-300 rounded-lg px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  {data.avatarPreview ? 'Change photo' : 'Upload photo'}
                </button>
                <p className="mt-2 text-xs text-gray-400">JPEG, PNG or WebP · Max 5 MB</p>
              </div>
            )}

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-100">
              {step > 1 ? (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              ) : (
                <div />
              )}

              {step < TOTAL_STEPS ? (
                <button
                  onClick={() => {
                    if (!canProceed()) return;
                    setStep((s) => s + 1);
                  }}
                  disabled={!canProceed()}
                  className="flex items-center gap-2 bg-primary-700 hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-primary-700 hover:bg-primary-800 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {isSaving ? 'Saving…' : 'Complete Setup'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
