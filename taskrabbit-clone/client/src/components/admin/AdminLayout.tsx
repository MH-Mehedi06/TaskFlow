import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import AdminErrorBoundary from './AdminErrorBoundary';
import { useDispatch, useSelector } from 'react-redux';
import {
  LayoutDashboard, Users, Briefcase, ShoppingBag, AlertTriangle,
  Star, Tag, DollarSign, Bell, Settings, ChevronLeft, ChevronRight,
  LogOut, Menu, X, Shield, ClipboardList,
} from 'lucide-react';
import { RootState } from '../../app/store';
import { logout } from '../../features/auth/authSlice';
import { useGetStatsQuery } from '../../features/admin/adminApi';

const NAV_SECTIONS = [
  {
    title: 'Platform',
    items: [
      { to: '/admin/overview', label: 'Overview', icon: LayoutDashboard },
      { to: '/admin/users', label: 'Users', icon: Users },
      { to: '/admin/taskers', label: 'Taskers', icon: Briefcase },
    ],
  },
  {
    title: 'Content',
    items: [
      { to: '/admin/tasks', label: 'Tasks', icon: ShoppingBag },
      { to: '/admin/disputes', label: 'Disputes', icon: AlertTriangle, badge: 'disputes' as const },
      { to: '/admin/reviews', label: 'Reviews', icon: Star, badge: 'reviews' as const },
    ],
  },
  {
    title: 'System',
    items: [
      { to: '/admin/categories', label: 'Categories', icon: Tag },
      { to: '/admin/financials', label: 'Financials', icon: DollarSign },
      { to: '/admin/broadcast', label: 'Broadcast', icon: Bell },
      { to: '/admin/settings', label: 'Settings', icon: Settings },
      { to: '/admin/audit-log', label: 'Audit Log', icon: ClipboardList },
    ],
  },
];

function useBreadcrumb() {
  const { pathname } = useLocation();
  const parts = pathname.split('/');
  const segment = parts[parts.length - 1] ?? 'overview';
  return segment.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.auth.user);
  const { data: stats } = useGetStatsQuery();
  const breadcrumb = useBreadcrumb();

  const badges: Record<string, number> = {
    disputes: stats?.openDisputes ?? 0,
    reviews: stats?.pendingReviews ?? 0,
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-gray-800 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Shield className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight">NeighbourWork</p>
            <p className="text-gray-400 text-[10px] font-medium uppercase tracking-widest">Admin</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        {NAV_SECTIONS.map(({ title, items }) => (
          <div key={title}>
            {!collapsed && (
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest px-2 mb-1.5">{title}</p>
            )}
            <div className="space-y-0.5">
              {items.map(({ to, label, icon: Icon, badge }) => {
                const count = badge ? badges[badge] : 0;
                return (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors group ${
                        isActive
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                      } ${collapsed ? 'justify-center' : 'justify-between'}`
                    }
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {!collapsed && label}
                    </span>
                    {!collapsed && count > 0 && (
                      <span className="min-w-[20px] h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                    {collapsed && count > 0 && (
                      <span className="absolute right-1.5 top-1.5 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer: admin info + collapse */}
      <div className="border-t border-gray-800 p-3 space-y-2">
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() ?? 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user?.name ?? 'Admin'}</p>
              <p className="text-gray-500 text-[10px] truncate">{user?.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-colors text-sm ${collapsed ? 'justify-center' : ''}`}
          title="Logout"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && 'Logout'}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex w-full items-center gap-2 px-3 py-2 rounded-xl text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-colors text-sm justify-center"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — desktop always visible, mobile drawer */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30 flex-shrink-0 bg-gray-900
          transition-all duration-200 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'w-16' : 'w-56'}
        `}
      >
        {/* Mobile close button */}
        <button
          className="absolute top-4 right-3 lg:hidden text-gray-400 hover:text-white"
          onClick={() => setMobileOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>
        {sidebarContent}
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4">
          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm text-gray-500 min-w-0">
            <span className="hidden sm:inline">Admin</span>
            <span className="hidden sm:inline text-gray-300">/</span>
            <span className="font-semibold text-gray-900">{breadcrumb}</span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold">
                {user?.name?.charAt(0)?.toUpperCase() ?? 'A'}
              </div>
              <span className="text-sm font-medium text-gray-700">{user?.name}</span>
            </div>
            <a
              href="/"
              className="text-xs text-gray-500 hover:text-primary-600 transition-colors border border-gray-200 rounded-lg px-3 py-1.5 hover:border-primary-300"
            >
              ← Back to site
            </a>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <AdminErrorBoundary>
            <Outlet />
          </AdminErrorBoundary>
        </main>
      </div>
    </div>
  );
}
