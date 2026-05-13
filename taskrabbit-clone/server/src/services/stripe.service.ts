import Stripe from 'stripe';
import { env } from '../config/env';

let stripe: Stripe | null = null;

if (env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion });
}

export const isStripeEnabled = () => !!stripe;

export const createPaymentIntent = async (
  amount: number,
  currency = 'usd',
  metadata: Record<string, string> = {}
) => {
  if (!stripe) {
    return {
      id: `pi_mock_${Date.now()}`,
      client_secret: `pi_mock_${Date.now()}_secret_mock`,
      amount: Math.round(amount * 100),
      currency,
      status: 'requires_payment_method' as const,
    };
  }
  return stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency,
    capture_method: 'manual',
    metadata,
  });
};

export const capturePaymentIntent = async (paymentIntentId: string) => {
  if (!stripe || paymentIntentId.startsWith('pi_mock_')) return { status: 'succeeded' };
  return stripe.paymentIntents.capture(paymentIntentId);
};

export const cancelPaymentIntent = async (paymentIntentId: string) => {
  if (!stripe || paymentIntentId.startsWith('pi_mock_')) return { status: 'canceled' };
  return stripe.paymentIntents.cancel(paymentIntentId);
};

export const refundPayment = async (paymentIntentId: string, amount?: number) => {
  if (!stripe || paymentIntentId.startsWith('pi_mock_')) return { id: `re_mock_${Date.now()}`, status: 'succeeded' };
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    ...(amount ? { amount: Math.round(amount * 100) } : {}),
  });
};

export const createConnectAccount = async (email: string) => {
  if (!stripe) return { id: `acct_mock_${Date.now()}`, charges_enabled: false };
  return stripe.accounts.create({
    type: 'express',
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
};

export const createAccountLink = async (accountId: string, returnUrl: string, refreshUrl: string) => {
  if (!stripe || accountId.startsWith('acct_mock_')) return { url: returnUrl };
  return stripe.accountLinks.create({
    account: accountId,
    return_url: returnUrl,
    refresh_url: refreshUrl,
    type: 'account_onboarding',
  });
};

export const createTransfer = async (
  amount: number,
  destination: string,
  metadata: Record<string, string> = {}
) => {
  if (!stripe || destination.startsWith('acct_mock_')) return { id: `tr_mock_${Date.now()}` };
  return stripe.transfers.create({
    amount: Math.round(amount * 100),
    currency: 'usd',
    destination,
    metadata,
  });
};

export const constructWebhookEvent = (payload: Buffer, signature: string, secret: string) => {
  if (!stripe) throw new Error('Stripe not initialised');
  return stripe.webhooks.constructEvent(payload, signature, secret);
};
