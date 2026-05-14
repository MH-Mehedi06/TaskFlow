import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Settings, DollarSign, Shield, Users, Mail, Save, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetSettingsQuery, useUpdateSettingsMutation } from '../../features/admin/adminApi';
import { SkeletonLine } from '../../components/admin/Skeleton';

interface SettingsForm {
  platformFeePercent: string;
  maintenanceMode: boolean;
  registrationOpen: boolean;
  maxTaskPrice: string;
  contactEmail: string;
}

function ToggleSwitch({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
        checked ? 'bg-primary-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function SettingsSection({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50">
        <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary-600" />
        </div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="p-6 space-y-5">{children}</div>
    </div>
  );
}

export default function AdminSettings() {
  const { data: settings, isLoading } = useGetSettingsQuery();
  const [updateSettings, { isLoading: isSaving }] = useUpdateSettingsMutation();
  const [dirty, setDirty] = useState(false);

  const [form, setForm] = useState<SettingsForm>({
    platformFeePercent: '20',
    maintenanceMode: false,
    registrationOpen: true,
    maxTaskPrice: '10000',
    contactEmail: '',
  });

  useEffect(() => {
    if (settings) {
      setForm({
        platformFeePercent: String(settings.platformFeePercent),
        maintenanceMode: settings.maintenanceMode,
        registrationOpen: settings.registrationOpen,
        maxTaskPrice: String(settings.maxTaskPrice),
        contactEmail: settings.contactEmail ?? '',
      });
      setDirty(false);
    }
  }, [settings]);

  const set = <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const fee = parseFloat(form.platformFeePercent);
    const maxPrice = parseFloat(form.maxTaskPrice);
    if (isNaN(fee) || fee < 0 || fee > 100) {
      toast.error('Platform fee must be between 0 and 100');
      return;
    }
    if (isNaN(maxPrice) || maxPrice <= 0) {
      toast.error('Max task price must be a positive number');
      return;
    }
    try {
      await updateSettings({
        platformFeePercent: fee,
        maintenanceMode: form.maintenanceMode,
        registrationOpen: form.registrationOpen,
        maxTaskPrice: maxPrice,
        contactEmail: form.contactEmail.trim() || undefined,
      }).unwrap();
      toast.success('Settings saved');
      setDirty(false);
    } catch { toast.error('Failed to save settings'); }
  };

  return (
    <>
      <Helmet><title>Settings | Admin</title></Helmet>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Platform Settings</h2>
            <p className="text-sm text-gray-500 mt-0.5">Configure fees, access control and platform behaviour</p>
          </div>
          {dirty && (
            <span className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
              <AlertTriangle className="w-3.5 h-3.5" /> Unsaved changes
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
                <SkeletonLine w="w-1/3" h="h-5" />
                <SkeletonLine w="w-full" h="h-10" />
                <SkeletonLine w="w-full" h="h-10" />
              </div>
            ))}
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Financials */}
            <SettingsSection title="Financial" icon={DollarSign}>
              <div>
                <label htmlFor="fee" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Platform fee (%)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="fee"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={form.platformFeePercent}
                    onChange={(e) => set('platformFeePercent', e.target.value)}
                    className="w-32 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-sm text-gray-500">
                    Tasker earns <strong>{Math.max(0, 100 - parseFloat(form.platformFeePercent || '0')).toFixed(1)}%</strong> of the task price
                  </p>
                </div>
              </div>
              <div>
                <label htmlFor="maxprice" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Maximum task price ($)
                </label>
                <input
                  id="maxprice"
                  type="number"
                  min="1"
                  step="100"
                  value={form.maxTaskPrice}
                  onChange={(e) => set('maxTaskPrice', e.target.value)}
                  className="w-48 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-400 mt-1">Tasks above this price will be rejected during booking</p>
              </div>
            </SettingsSection>

            {/* Access control */}
            <SettingsSection title="Access control" icon={Shield}>
              <div className="flex items-center justify-between py-1">
                <div>
                  <label htmlFor="reg" className="text-sm font-medium text-gray-800">User registration</label>
                  <p className="text-xs text-gray-500 mt-0.5">Allow new users to create accounts</p>
                </div>
                <ToggleSwitch id="reg" checked={form.registrationOpen} onChange={(v) => set('registrationOpen', v)} />
              </div>
              <div className="h-px bg-gray-100" />
              <div className="flex items-center justify-between py-1">
                <div>
                  <label htmlFor="maint" className="flex items-center gap-2 text-sm font-medium text-gray-800">
                    Maintenance mode
                    {form.maintenanceMode && (
                      <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full animate-pulse">ACTIVE</span>
                    )}
                  </label>
                  <p className="text-xs text-gray-500 mt-0.5">Shows a maintenance page to all non-admin users</p>
                </div>
                <ToggleSwitch id="maint" checked={form.maintenanceMode} onChange={(v) => set('maintenanceMode', v)} />
              </div>
            </SettingsSection>

            {/* Contact */}
            <SettingsSection title="Contact & support" icon={Mail}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Platform contact email
                </label>
                <input
                  id="email"
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => set('contactEmail', e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="support@taskflow.com"
                />
                <p className="text-xs text-gray-400 mt-1">Shown in footer and emails as the main support address</p>
              </div>
            </SettingsSection>

            {/* Platform info (read-only) */}
            <SettingsSection title="Platform info" icon={Users}>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  { label: 'Environment', value: (import.meta as unknown as { env?: { MODE?: string } }).env?.MODE ?? 'unknown' },
                  { label: 'API base', value: '/api' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs font-medium text-gray-500 mb-0.5">{label}</p>
                    <p className="font-mono text-gray-700 text-xs">{value}</p>
                  </div>
                ))}
              </div>
            </SettingsSection>

            {/* Save button */}
            <div className="flex items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={isSaving || !dirty}
                className="flex items-center gap-2 px-6 py-3 bg-primary-700 hover:bg-primary-800 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? 'Saving…' : 'Save settings'}
              </button>
              {!dirty && settings && (
                <span className="flex items-center gap-1.5 text-xs text-green-600">
                  <CheckCircle className="w-3.5 h-3.5" /> All changes saved
                </span>
              )}
            </div>
          </form>
        )}
      </div>
    </>
  );
}
