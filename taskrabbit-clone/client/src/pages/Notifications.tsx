import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Bell, Check, CheckCheck, Loader2, Trash2 } from 'lucide-react';
import {
  useGetNotificationsQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
  useDeleteNotificationMutation,
} from '../features/notifications/notificationApi';
import { INotification } from '../types';

const NOTIF_ICON: Record<string, string> = {
  booking_confirmed: '📋',
  task_assigned: '✅',
  task_completed: '🎉',
  payment_received: '💰',
  new_message: '💬',
  review_request: '⭐',
  dispute_update: '⚠️',
  system: '🔔',
};

const NOTIF_COLOR: Record<string, string> = {
  booking_confirmed: 'bg-blue-50 border-blue-200',
  task_assigned: 'bg-green-50 border-green-200',
  task_completed: 'bg-purple-50 border-purple-200',
  payment_received: 'bg-emerald-50 border-emerald-200',
  new_message: 'bg-indigo-50 border-indigo-200',
  review_request: 'bg-amber-50 border-amber-200',
  dispute_update: 'bg-red-50 border-red-200',
  system: 'bg-gray-50 border-gray-200',
};

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return new Date(iso).toLocaleDateString();
}

function NotificationCard({ notif }: { notif: INotification }) {
  const [markRead] = useMarkReadMutation();
  const [deleteNotif] = useDeleteNotificationMutation();

  const colorClass = NOTIF_COLOR[notif.type] ?? 'bg-gray-50 border-gray-200';

  return (
    <div className={`flex items-start gap-4 p-4 rounded-xl border ${colorClass} ${!notif.isRead ? 'ring-1 ring-primary-200' : ''}`}>
      <span className="text-2xl flex-shrink-0">{NOTIF_ICON[notif.type] ?? '🔔'}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <Link
            to={notif.link ?? '/notifications'}
            onClick={() => !notif.isRead && markRead(notif._id)}
            className="hover:underline"
          >
            <p className={`text-sm ${notif.isRead ? 'font-medium text-gray-700' : 'font-semibold text-gray-900'}`}>
              {notif.title}
            </p>
          </Link>
          {!notif.isRead && <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-1.5" />}
        </div>
        <p className="text-sm text-gray-500 mt-0.5">{notif.body}</p>
        <p className="text-xs text-gray-400 mt-1">{fmtRelative(notif.createdAt)}</p>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {!notif.isRead && (
          <button
            onClick={() => markRead(notif._id)}
            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-white rounded-lg transition-colors"
            title="Mark as read"
          >
            <Check className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => deleteNotif(notif._id)}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function Notifications() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGetNotificationsQuery({ page });
  const [markAllRead] = useMarkAllReadMutation();

  const notifications = data?.notifications ?? [];
  const unread = data?.unread ?? 0;
  const pages = data?.pages ?? 1;

  return (
    <>
      <Helmet><title>Notifications | TaskFlow</title></Helmet>
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            {unread > 0 && <p className="text-sm text-gray-500 mt-0.5">{unread} unread</p>}
          </div>
          {unread > 0 && (
            <button
              onClick={() => markAllRead()}
              className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-800 font-medium border border-primary-200 hover:bg-primary-50 px-3 py-1.5 rounded-xl transition-colors"
            >
              <CheckCheck className="w-4 h-4" /> Mark all as read
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Bell className="w-14 h-14 mx-auto mb-4 opacity-20" />
            <p className="font-medium text-gray-500">No notifications yet</p>
            <p className="text-sm mt-1">You'll be notified about tasks, payments, and messages here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => <NotificationCard key={n._id} notif={n} />)}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm border border-gray-300 rounded-xl disabled:opacity-40 hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-600">{page} / {pages}</span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="px-4 py-2 text-sm border border-gray-300 rounded-xl disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </>
  );
}
