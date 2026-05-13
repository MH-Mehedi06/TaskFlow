import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '../../app/store';

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/auth',
    credentials: 'include',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.accessToken;
      if (token) headers.set('authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  endpoints: (builder) => ({
    register: builder.mutation({ query: (body) => ({ url: '/register', method: 'POST', body }) }),
    login: builder.mutation({ query: (body) => ({ url: '/login', method: 'POST', body }) }),
    logout: builder.mutation({ query: () => ({ url: '/logout', method: 'POST' }) }),
    refreshToken: builder.mutation({ query: () => ({ url: '/refresh-token', method: 'POST' }) }),
    verifyEmail: builder.mutation({ query: (body) => ({ url: '/verify-email', method: 'POST', body }) }),
    forgotPassword: builder.mutation({ query: (body) => ({ url: '/forgot-password', method: 'POST', body }) }),
    resetPassword: builder.mutation({ query: (body) => ({ url: '/reset-password', method: 'POST', body }) }),
    getMe: builder.query({ query: () => '/me' }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useLogoutMutation,
  useRefreshTokenMutation,
  useVerifyEmailMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useGetMeQuery,
} = authApi;
