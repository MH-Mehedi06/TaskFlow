import { Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from '../components/admin/AdminLayout';
import Overview from './admin/Overview';
import Users from './admin/Users';
import Taskers from './admin/Taskers';
import Tasks from './admin/Tasks';
import Disputes from './admin/Disputes';
import Reviews from './admin/Reviews';
import Categories from './admin/Categories';
import Financials from './admin/Financials';
import Broadcast from './admin/Broadcast';
import AdminSettings from './admin/AdminSettings';
import AuditLog from './admin/AuditLog';

export default function AdminDashboard() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<Overview />} />
        <Route path="users" element={<Users />} />
        <Route path="taskers" element={<Taskers />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="disputes" element={<Disputes />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="categories" element={<Categories />} />
        <Route path="financials" element={<Financials />} />
        <Route path="broadcast" element={<Broadcast />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="audit-log" element={<AuditLog />} />
        <Route path="*" element={<Navigate to="overview" replace />} />
      </Route>
    </Routes>
  );
}
