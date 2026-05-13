import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { RootState } from './store';
import { setTokens, logout } from '../features/auth/authSlice';

let refreshing: Promise<boolean> | null = null;

export function makeBaseQuery(baseUrl: string): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> {
  const raw = fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.accessToken;
      if (token) headers.set('authorization', `Bearer ${token}`);
      return headers;
    },
  });

  return async (args, api, extraOptions) => {
    let result = await raw(args, api, extraOptions);

    if (result.error?.status === 401) {
      // Only one refresh attempt at a time
      if (!refreshing) {
        refreshing = (async () => {
          const authRaw = fetchBaseQuery({ baseUrl: '/api/auth', credentials: 'include' });
          const refresh = await authRaw({ url: '/refresh-token', method: 'POST' }, api, extraOptions);
          if (refresh.data) {
            const newToken = (refresh.data as { data?: { accessToken?: string } }).data?.accessToken;
            if (newToken) {
              api.dispatch(setTokens({ accessToken: newToken }));
              return true;
            }
          }
          api.dispatch(logout());
          return false;
        })().finally(() => { refreshing = null; });
      }

      const refreshed = await refreshing;
      if (refreshed) {
        result = await raw(args, api, extraOptions);
      }
    }

    return result;
  };
}
