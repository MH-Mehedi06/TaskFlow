import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Bell, MessageSquare, ChevronDown, LogOut, User, LayoutDashboard, Wrench, X, Check, Search } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { logout } from '../../features/auth/authSlice';
import { useGetUnreadCountQuery, useGetNotificationsQuery, useMarkReadMutation, useMarkAllReadMutation } from '../../features/notifications/notificationApi';
import { notificationApi } from '../../features/notifications/notificationApi';
import { getSocket } from '../../lib/socket';
import { INotification } from '../../types';

// ── Notification type icon mapping ────────────────────────────────────────────
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

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── NotificationBell ─────────────────────────────────────────────────────────

function NotificationBell() {
  const dispatch = useAppDispatch();
  const { data: unread = 0 } = useGetUnreadCountQuery();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: notifData, refetch } = useGetNotificationsQuery({ page: 1 }, { skip: !open });
  const [markRead] = useMarkReadMutation();
  const [markAllRead] = useMarkAllReadMutation();

  const notifications: INotification[] = notifData?.notifications ?? [];

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Socket: invalidate cache on new notification
  useEffect(() => {
    const socket = getSocket();
    const handler = () => {
      dispatch(notificationApi.util.invalidateTags(['Notification']));
    };
    socket.on('notification:new', handler);
    return () => { socket.off('notification:new', handler); };
  }, [dispatch]);

  const handleMarkRead = async (id: string) => {
    await markRead(id);
  };

  const handleMarkAll = async () => {
    await markAllRead();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-900 text-sm">Notifications</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={handleMarkAll} className="text-xs text-primary-600 hover:underline">
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-primary-50/40' : ''}`}
                >
                  <span className="text-lg flex-shrink-0 mt-0.5">{NOTIF_ICON[n.type] ?? '🔔'}</span>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={n.link ?? '/notifications'}
                      onClick={() => { handleMarkRead(n._id); setOpen(false); }}
                      className="block"
                    >
                      <p className={`text-sm font-medium text-gray-900 truncate ${!n.isRead ? 'font-semibold' : ''}`}>{n.title}</p>
                      <p className="text-xs text-gray-500 line-clamp-1">{n.body}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{fmtRelative(n.createdAt)}</p>
                    </Link>
                  </div>
                  {!n.isRead && (
                    <button
                      onClick={() => handleMarkRead(n._id)}
                      className="p-1 rounded hover:bg-white flex-shrink-0"
                      title="Mark as read"
                    >
                      <Check className="w-3 h-3 text-primary-600" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-4 py-2">
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-xs text-primary-600 hover:underline py-1"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ── UserMenu ──────────────────────────────────────────────────────────────────

function UserMenu() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const dashLink = user?.role === 'tasker' ? '/tasker/dashboard' : '/dashboard';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
      >
        {user?.avatar ? (
          <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-sm font-medium text-gray-700 hidden sm:block max-w-[100px] truncate">{user?.name}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          <Link to={dashLink} onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </Link>
          {user?.role === 'tasker' && (
            <Link to="/tasker/onboarding" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
              <User className="w-4 h-4" /> Edit Profile
            </Link>
          )}
          {user?.role === 'admin' && (
            <Link to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
              <Wrench className="w-4 h-4" /> Admin
            </Link>
          )}
          <div className="border-t border-gray-100" />
          <button onClick={handleLogout} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      )}
    </div>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

const MARKETING_PATHS = ['/', '/services', '/taskers', '/become-a-tasker', '/search', '/login', '/register', '/forgot-password'];

function Footer({ path }: { path: string }) {
  const show = MARKETING_PATHS.some((p) => path === p || path.startsWith('/services/') || path.startsWith('/taskers/'));
  if (!show) return null;

  return (
    <footer className="bg-[#0F2044] text-blue-200 py-12 px-4 mt-auto">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-lg mb-4">
              <Wrench className="w-5 h-5" /> TaskFlow
            </div>
            <p className="text-sm leading-relaxed">Connecting people who need help with skilled, trusted Taskers in their neighbourhood.</p>
          </div>
          <div>
            <p className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">Services</p>
            <ul className="space-y-2 text-sm">
              {['Home Cleaning', 'Handyman', 'Moving', 'Furniture Assembly'].map((s) => (
                <li key={s}><Link to={`/services`} className="hover:text-white transition-colors">{s}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">Company</p>
            <ul className="space-y-2 text-sm">
              {[
                { to: '/become-a-tasker', label: 'Become a Tasker' },
                { to: '/services', label: 'All Services' },
                { to: '/taskers', label: 'Find Taskers' },
                { to: '/search', label: 'Search' },
              ].map(({ to, label }) => (
                <li key={to}><Link to={to} className="hover:text-white transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">Account</p>
            <ul className="space-y-2 text-sm">
              {[
                { to: '/login', label: 'Sign in' },
                { to: '/register', label: 'Create account' },
                { to: '/register?role=tasker', label: 'Join as Tasker' },
              ].map(({ to, label }) => (
                <li key={to}><Link to={to} className="hover:text-white transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-blue-300">
          <p>© {new Date().getFullYear()} TaskFlow. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="hover:text-white cursor-default">Privacy Policy</span>
            <span className="hover:text-white cursor-default">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function Layout() {
  const { user } = useAppSelector((s) => s.auth);
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 md:px-6 sticky top-0 z-40">
        <div className="flex items-center gap-6 flex-1">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-primary-700 text-lg">
            <Wrench className="w-5 h-5" />
            <span className="hidden sm:block">TaskFlow</span>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link to="/services" className="px-3 py-1.5 text-sm text-gray-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors">
              Services
            </Link>
            <Link to="/taskers" className="px-3 py-1.5 text-sm text-gray-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors">
              Find Taskers
            </Link>
            {user && (
              <Link to={user.role === 'tasker' ? '/tasker/dashboard' : '/dashboard'} className="px-3 py-1.5 text-sm text-gray-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors">
                Dashboard
              </Link>
            )}
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1">
          {user ? (
            <>
              <Link to="/search" className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Search">
                <Search className="w-5 h-5" />
              </Link>
              <Link to="/chat" className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Chat">
                <MessageSquare className="w-5 h-5" />
              </Link>
              <NotificationBell />
              <UserMenu />
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors">
                Log in
              </Link>
              <Link to="/register" className="px-4 py-2 text-sm bg-primary-700 hover:bg-primary-800 text-white rounded-xl font-medium transition-colors">
                Sign up
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">
        <Outlet />
      </main>

      <Footer path={location.pathname} />
    </div>
  );
}
