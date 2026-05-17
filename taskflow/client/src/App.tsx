import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Helmet } from 'react-helmet-async';
import { useDispatch } from 'react-redux';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PageLoader } from './components/PageLoader';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import Layout from './components/layout/Layout';
import { setCredentials, setTokens } from './features/auth/authSlice';
import { AppDispatch } from './app/store';

// Lazy-loaded pages
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Auth/Login'));
const Register = lazy(() => import('./pages/Auth/Register'));
const ForgotPassword = lazy(() => import('./pages/Auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/Auth/ResetPassword'));
const Services = lazy(() => import('./pages/Services'));
const TaskerSearch = lazy(() => import('./pages/TaskerSearch'));
const SearchPage = lazy(() => import('./pages/Search'));
const TaskerProfile = lazy(() => import('./pages/TaskerProfile'));
const BookingWizard = lazy(() => import('./pages/BookingWizard'));
const TaskerOnboarding = lazy(() => import('./pages/TaskerOnboarding'));
const ClientDashboard = lazy(() => import('./pages/client/Dashboard'));
const TaskDetail = lazy(() => import('./pages/client/TaskDetail'));
const TaskerDashboard = lazy(() => import('./pages/tasker/Dashboard'));
const Chat = lazy(() => import('./pages/Chat'));
const Notifications = lazy(() => import('./pages/Notifications'));
const DisputeForm = lazy(() => import('./pages/DisputeForm'));
const DisputeDetail = lazy(() => import('./pages/DisputeDetail'));
const BecomeTasker = lazy(() => import('./pages/BecomeTasker'));
const Payment = lazy(() => import('./pages/Payment'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Unauthorized = lazy(() => import('./pages/Unauthorized'));

// Silently refreshes the access token in the background on every app load.
// Session is restored immediately from localStorage (see authSlice); this
// just keeps the token fresh so the first API call doesn't need to re-auth.
function AuthInit({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch('/api/auth/refresh-token', {
          method: 'POST',
          credentials: 'include',
          signal: controller.signal,
        });
        if (res.ok) {
          const body = await res.json();
          const { accessToken, user } = body?.data ?? {};
          if (accessToken && user) {
              dispatch(setCredentials({ user, accessToken }));
            } else if (accessToken) {
              dispatch(setTokens({ accessToken }));
            }
        }
      } catch { /* AbortError or network error — fine, session still in localStorage */ }
    })();
    return () => controller.abort();
  }, [dispatch]);

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Helmet defaultTitle="TaskFlow" titleTemplate="%s | TaskFlow" />
      <ErrorBoundary>
        <AuthInit>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Admin — uses its own AdminLayout shell (no main navbar) */}
              <Route element={<ProtectedRoute requiredRole="admin" />}>
                <Route path="/admin/*" element={<AdminDashboard />} />
              </Route>

              {/* All other routes wrapped in Layout (header + nav) */}
              <Route element={<Layout />}>
                {/* Public */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/services" element={<Services />} />
                <Route path="/services/:slug" element={<Services />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/taskers" element={<TaskerSearch />} />
                <Route path="/taskers/:id" element={<TaskerProfile />} />
                <Route path="/become-a-tasker" element={<BecomeTasker />} />

                {/* Auth required */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/book" element={<BookingWizard />} />
                  <Route path="/book/:categorySlug" element={<BookingWizard />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/chat/:conversationId" element={<Chat />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/tasks/:id" element={<TaskDetail />} />
                  <Route path="/payment/:taskId" element={<Payment />} />
                  <Route path="/tasks/:id/dispute" element={<DisputeForm />} />
                  <Route path="/disputes/:id" element={<DisputeDetail />} />
                </Route>

                {/* Client dashboard */}
                <Route element={<ProtectedRoute requiredRole="client" />}>
                  <Route path="/dashboard/*" element={<ClientDashboard />} />
                </Route>

                {/* Tasker routes */}
                <Route element={<ProtectedRoute requiredRole="tasker" />}>
                  <Route path="/tasker/onboarding" element={<TaskerOnboarding />} />
                  <Route path="/tasker/dashboard/*" element={<TaskerDashboard />} />
                </Route>

                {/* Error pages */}
                <Route path="/unauthorized" element={<Unauthorized />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </AuthInit>
      </ErrorBoundary>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
    </BrowserRouter>
  );
}
