import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Lock, ArrowLeft, CheckCircle, Loader2, CreditCard, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { stripePromise, isStripeEnabled } from '../lib/stripe';
import { useCreatePaymentIntentMutation, useConfirmPaymentMutation } from '../features/payments/paymentApi';
import { useGetTaskByIdQuery } from '../features/tasks/taskApi';
import { ICategory, ITaskerProfile, IUser } from '../types';

// ─── Real Stripe card form ────────────────────────────────────────────────────

function StripeCardForm({ taskId, clientSecret, amount }: { taskId: string; clientSecret: string; amount: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [confirmPayment] = useConfirmPaymentMutation();
  const [paying, setPaying] = useState(false);
  const [cardError, setCardError] = useState('');

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setPaying(true);
    setCardError('');

    const card = elements.getElement(CardElement);
    if (!card) { setPaying(false); return; }

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card },
    });

    if (error) {
      setCardError(error.message ?? 'Payment failed');
      setPaying(false);
      return;
    }

    if (paymentIntent?.status === 'requires_capture' || paymentIntent?.status === 'succeeded') {
      await confirmPayment({ taskId }).unwrap();
      toast.success('Payment successful!');
      navigate(`/tasks/${taskId}`);
    }

    setPaying(false);
  };

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <div className="border border-gray-300 rounded-xl px-4 py-3.5 focus-within:ring-2 focus-within:ring-primary-500">
        <CardElement
          options={{
            style: {
              base: { fontSize: '15px', color: '#111827', '::placeholder': { color: '#9ca3af' } },
              invalid: { color: '#ef4444' },
            },
          }}
        />
      </div>
      {cardError && <p className="text-sm text-red-600">{cardError}</p>}
      <button
        type="submit"
        disabled={paying || !stripe}
        className="w-full flex items-center justify-center gap-2 bg-primary-700 hover:bg-primary-800 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-colors"
      >
        {paying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
        {paying ? 'Processing…' : `Pay $${amount.toFixed(2)}`}
      </button>
    </form>
  );
}

// ─── Dev/mock payment form ────────────────────────────────────────────────────

function MockPaymentForm({ taskId, amount }: { taskId: string; amount: number }) {
  const navigate = useNavigate();
  const [confirmPayment] = useConfirmPaymentMutation();
  const [paying, setPaying] = useState(false);

  const handleSimulate = async () => {
    setPaying(true);
    await new Promise((r) => setTimeout(r, 1200));
    try {
      await confirmPayment({ taskId }).unwrap();
      toast.success('Payment simulated successfully!');
      navigate(`/tasks/${taskId}`);
    } catch {
      toast.error('Payment simulation failed');
    }
    setPaying(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-amber-700">Test Mode — No real payment</p>
        </div>
        <p className="text-xs text-amber-600">
          Stripe keys are not configured. Click below to simulate a successful payment.
          In production, add <code className="bg-amber-100 px-1 rounded">VITE_STRIPE_PUBLISHABLE_KEY</code> to your .env.
        </p>
      </div>

      <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <CreditCard className="w-4 h-4" />
          Test card number
        </div>
        <p className="font-mono text-gray-800 text-sm">4242 4242 4242 4242</p>
        <p className="text-xs text-gray-400 mt-1">Any future expiry · Any CVC · Any ZIP</p>
      </div>

      <button
        onClick={handleSimulate}
        disabled={paying}
        className="w-full flex items-center justify-center gap-2 bg-primary-700 hover:bg-primary-800 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-colors"
      >
        {paying ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
        {paying ? 'Simulating…' : `Simulate Payment · $${amount.toFixed(2)}`}
      </button>
    </div>
  );
}

// ─── Main Payment page ────────────────────────────────────────────────────────

export default function Payment() {
  const { taskId } = useParams<{ taskId: string }>();
  const { data: task, isLoading: loadingTask } = useGetTaskByIdQuery(taskId!);
  const [createIntent] = useCreatePaymentIntentMutation();

  const [intentData, setIntentData] = useState<{ clientSecret: string; amount: number; isMock: boolean } | null>(null);
  const [intentLoading, setIntentLoading] = useState(false);
  const [intentError, setIntentError] = useState('');

  useEffect(() => {
    if (!task || intentData) return;
    if (!task.price) return;

    setIntentLoading(true);
    createIntent({ taskId: taskId! })
      .unwrap()
      .then((res) => setIntentData({ clientSecret: res.clientSecret, amount: res.amount, isMock: res.isMock }))
      .catch((err) => setIntentError(err?.data?.message ?? 'Failed to initialise payment'))
      .finally(() => setIntentLoading(false));
  }, [task]);

  const cat = task?.categoryId as ICategory | undefined;
  const tasker = task?.taskerId as IUser | undefined;

  if (loadingTask || intentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-700" />
      </div>
    );
  }

  if (!task || !task.price) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-3">No payment required for this task.</p>
          <Link to={`/tasks/${taskId}`} className="text-primary-600 hover:underline">Back to task</Link>
        </div>
      </div>
    );
  }

  if (task.paymentStatus !== 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="font-semibold text-gray-900 mb-1">Payment already processed</p>
          <p className="text-gray-500 text-sm mb-4">Status: {task.paymentStatus}</p>
          <Link to={`/tasks/${taskId}`} className="text-primary-600 hover:underline">View task</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Complete Payment | NeighbourWork</title></Helmet>

      <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-lg mx-auto">
          <Link to={`/tasks/${taskId}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to task
          </Link>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-3">
                <Lock className="w-7 h-7 text-primary-700" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Secure payment</h1>
              <p className="text-sm text-gray-500 mt-1">Your funds are held until the task is complete</p>
            </div>

            {/* Order summary */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Service</span>
                <span className="font-medium">{cat?.icon} {cat?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Task</span>
                <span className="font-medium truncate max-w-[180px]">{task.title}</span>
              </div>
              {tasker && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Tasker</span>
                  <span className="font-medium">{tasker.name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Est. hours</span>
                <span className="font-medium">{task.estimatedHours}h</span>
              </div>
              <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between">
                <span className="font-semibold text-gray-700">Total</span>
                <span className="font-bold text-lg text-gray-900">${task.price.toFixed(2)}</span>
              </div>
              {task.platformFee && (
                <p className="text-xs text-gray-400 text-right">
                  Incl. ${task.platformFee.toFixed(2)} platform fee
                </p>
              )}
            </div>

            {/* Payment form */}
            {intentError ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
                {intentError}
              </div>
            ) : intentData ? (
              isStripeEnabled && !intentData.isMock && stripePromise ? (
                <Elements stripe={stripePromise} options={{ clientSecret: intentData.clientSecret }}>
                  <StripeCardForm taskId={taskId!} clientSecret={intentData.clientSecret} amount={intentData.amount} />
                </Elements>
              ) : (
                <MockPaymentForm taskId={taskId!} amount={intentData.amount} />
              )
            ) : null}

            {/* Trust badges */}
            <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-center gap-6 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> 256-bit SSL</span>
              <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Held securely</span>
              <span className="flex items-center gap-1">🛡️ $1M insured</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
