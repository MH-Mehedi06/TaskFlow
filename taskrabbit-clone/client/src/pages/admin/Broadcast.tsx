import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Bell, Loader2, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { useBroadcastNotificationMutation } from '../../features/admin/adminApi';

export default function Broadcast() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [broadcast, { isLoading }] = useBroadcastNotificationMutation();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) { toast.error('Title and body are required'); return; }
    try {
      await broadcast({ title, body, link: link || undefined }).unwrap();
      toast.success('Notification broadcast sent!');
      setTitle(''); setBody(''); setLink('');
    } catch { toast.error('Failed to broadcast'); }
  };

  return (
    <>
      <Helmet><title>Broadcast | Admin</title></Helmet>
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Broadcast Notification</h2>
          <p className="text-sm text-gray-500 mt-0.5">Send a push notification to all platform users</p>
        </div>

        <div className="max-w-xl">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Send to all users</p>
                <p className="text-xs text-gray-500">This will notify every active user on the platform</p>
              </div>
            </div>

            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. New Feature Available!"
                  maxLength={80}
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{title.length}/80</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  placeholder="Write the notification message…"
                  maxLength={300}
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{body.length}/300</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Link <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="/announcements or https://…"
                />
              </div>

              {/* Preview */}
              {(title || body) && (
                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Preview</p>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
                      <Bell className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      {title && <p className="text-sm font-semibold text-gray-900">{title}</p>}
                      {body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{body}</p>}
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-primary-700 hover:bg-primary-800 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isLoading ? 'Sending…' : 'Send broadcast'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
