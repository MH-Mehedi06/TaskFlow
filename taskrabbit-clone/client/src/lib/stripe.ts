import { loadStripe } from '@stripe/stripe-js';

const key = (import.meta as unknown as { env: Record<string, string> }).env.VITE_STRIPE_PUBLISHABLE_KEY;
export const stripePromise = key ? loadStripe(key) : null;
export const isStripeEnabled = !!key;
