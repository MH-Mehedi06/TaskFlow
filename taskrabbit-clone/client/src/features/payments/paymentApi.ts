import { createApi } from '@reduxjs/toolkit/query/react';
import { makeBaseQuery } from '../../app/baseQueryWithReauth';
import { ITask, ApiResponse } from '../../types';

interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  isMock: boolean;
}

interface ConnectAccountResult {
  accountId: string;
  alreadyExists?: boolean;
}

interface ConnectLinkResult {
  url: string;
  isMock: boolean;
}

export const paymentApi = createApi({
  reducerPath: 'paymentApi',
  keepUnusedDataFor: 60,
  baseQuery: makeBaseQuery('/api/payments'),
  tagTypes: ['Payment'],
  endpoints: (builder) => ({
    createPaymentIntent: builder.mutation<PaymentIntentResult, { taskId: string }>({
      query: (body) => ({ url: '/create-intent', method: 'POST', body }),
      transformResponse: (res: ApiResponse<PaymentIntentResult>) => res.data,
    }),
    confirmPayment: builder.mutation<{ paymentStatus: string }, { taskId: string }>({
      query: (body) => ({ url: '/confirm', method: 'POST', body }),
      transformResponse: (res: ApiResponse<{ paymentStatus: string }>) => res.data,
      invalidatesTags: ['Payment'],
    }),
    capturePayment: builder.mutation<ITask, string>({
      query: (taskId) => ({ url: `/capture/${taskId}`, method: 'POST' }),
      transformResponse: (res: ApiResponse<ITask>) => res.data,
      invalidatesTags: ['Payment'],
    }),
    getPaymentHistory: builder.query<ITask[], void>({
      query: () => '/history',
      transformResponse: (res: ApiResponse<ITask[]>) => res.data,
      providesTags: ['Payment'],
    }),
    createConnectAccount: builder.mutation<ConnectAccountResult, void>({
      query: () => ({ url: '/connect/create', method: 'POST' }),
      transformResponse: (res: ApiResponse<ConnectAccountResult>) => res.data,
    }),
    getConnectOnboardingLink: builder.query<ConnectLinkResult, void>({
      query: () => '/connect/link',
      transformResponse: (res: ApiResponse<ConnectLinkResult>) => res.data,
    }),
  }),
});

export const {
  useCreatePaymentIntentMutation,
  useConfirmPaymentMutation,
  useCapturePaymentMutation,
  useGetPaymentHistoryQuery,
  useCreateConnectAccountMutation,
  useGetConnectOnboardingLinkQuery,
} = paymentApi;
