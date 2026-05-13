import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { useForgotPasswordMutation } from '../../features/auth/authApi';

const schema = z.object({ email: z.string().email('Valid email required') });
type FormData = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [forgotPassword, { isLoading, isSuccess }] = useForgotPasswordMutation();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await forgotPassword(data).unwrap();
      toast.success('Reset link sent if that email exists');
    } catch {
      toast.error('Something went wrong. Try again.');
    }
  };

  return (
    <>
      <Helmet><title>Forgot Password</title></Helmet>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="text-2xl font-bold text-primary-700">NeighbourWork</Link>
            <h1 className="mt-4 text-3xl font-bold text-gray-900">Reset password</h1>
            <p className="mt-2 text-gray-600">We'll send a reset link to your email</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            {isSuccess ? (
              <div className="text-center py-4">
                <div className="text-5xl mb-4">📧</div>
                <p className="text-gray-700 font-medium">Check your inbox!</p>
                <p className="text-gray-500 text-sm mt-2">If an account with that email exists, we've sent a reset link.</p>
                <Link to="/login" className="mt-6 inline-block text-primary-600 hover:underline font-medium">Back to Login</Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="you@example.com"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary-700 hover:bg-primary-800 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  {isLoading ? 'Sending…' : 'Send Reset Link'}
                </button>
                <p className="text-center text-sm">
                  <Link to="/login" className="text-primary-600 hover:underline">Back to Login</Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
