import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { useResetPasswordMutation } from '../../features/auth/authApi';

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});
type FormData = z.infer<typeof schema>;

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [resetPassword, { isLoading }] = useResetPasswordMutation();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await resetPassword({ token, password: data.password }).unwrap();
      toast.success('Password reset! Please log in.');
      navigate('/login');
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message || 'Reset failed. Link may be expired.';
      toast.error(msg);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Invalid reset link.</p>
          <Link to="/forgot-password" className="text-primary-600 hover:underline mt-2 block">Request a new one</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Reset Password</title></Helmet>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="text-2xl font-bold text-primary-700">NeighbourWork</Link>
            <h1 className="mt-4 text-3xl font-bold text-gray-900">Set new password</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  {...register('password')}
                  type="password"
                  placeholder="Min 8 characters"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input
                  {...register('confirmPassword')}
                  type="password"
                  placeholder="••••••••"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary-700 hover:bg-primary-800 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {isLoading ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
