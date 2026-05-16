import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import { useLoginMutation } from '../../features/auth/authApi';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { setCredentials } from '../../features/auth/authSlice';

const schema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
});
type FormData = z.infer<typeof schema>;

const getRoleDefault = (role?: string) => {
  if (role === 'admin') return '/admin';
  if (role === 'tasker') return '/tasker/dashboard';
  return '/dashboard';
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const [login, { isLoading }] = useLoginMutation();
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  // Already authenticated — redirect without useEffect timing issues
  if (user) return <Navigate to={from || getRoleDefault(user.role)} replace />;

  const onSubmit = async (data: FormData) => {
    try {
      const res = await login(data).unwrap();
      const loggedInUser = res?.data?.user;
      const accessToken = res?.data?.accessToken;
      dispatch(setCredentials({ user: loggedInUser, accessToken }));
      toast.success('Welcome back!');
      navigate(from || getRoleDefault(loggedInUser?.role), { replace: true });
    } catch (err: unknown) {
      const e = err as { data?: { message?: string }; error?: string; status?: number | string };
      console.error('[Login] error object:', JSON.stringify(e));
      let msg: string;
      if (e?.data?.message) {
        msg = e.data.message;
      } else if (e?.status === 'FETCH_ERROR' || e?.status === 'TIMEOUT_ERROR') {
        msg = 'Cannot reach server. Make sure both servers are running.';
      } else if (e?.error) {
        msg = e.error;
      } else {
        msg = 'Login failed. Please check your credentials.';
      }
      toast.error(msg);
    }
  };

  return (
    <>
      <Helmet><title>Log In</title></Helmet>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="text-2xl font-bold text-primary-700">TaskFlow</Link>
            <h1 className="mt-4 text-3xl font-bold text-gray-900">Welcome back</h1>
            <p className="mt-2 text-gray-600">Log in to your account</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
              </div>

              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-sm text-primary-600 hover:underline">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary-700 hover:bg-primary-800 disabled:opacity-60 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                {isLoading ? 'Logging in…' : 'Log In'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-primary-600 hover:underline">Sign up</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
