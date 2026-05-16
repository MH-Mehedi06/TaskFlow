import { createApi } from '@reduxjs/toolkit/query/react';
import { makeBaseQuery } from '../../app/baseQueryWithReauth';
import { ITaskerProfile, ITask, ICategory, ApiResponse, PaginatedResponse } from '../../types';

export interface TaskerSearchResult extends PaginatedResponse<ITaskerProfile> {
  query: string;
}

export interface UnifiedSearchResult {
  taskers: ITaskerProfile[];
  tasks: ITask[];
  categories: ICategory[];
  query: string;
}

export interface SearchTaskersParams {
  q: string;
  page?: number;
  limit?: number;
}

export const searchApi = createApi({
  reducerPath: 'searchApi',
  keepUnusedDataFor: 60,
  baseQuery: makeBaseQuery('/api/search'),
  endpoints: (builder) => ({
    searchTaskers: builder.query<TaskerSearchResult, SearchTaskersParams>({
      query: ({ q, page = 1, limit = 12 }) =>
        `taskers?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`,
      transformResponse: (res: ApiResponse<TaskerSearchResult>) => res.data,
    }),
    searchAll: builder.query<UnifiedSearchResult, string>({
      query: (q) => `?q=${encodeURIComponent(q)}`,
      transformResponse: (res: ApiResponse<UnifiedSearchResult>) => res.data,
    }),
  }),
});

export const { useSearchTaskersQuery, useSearchAllQuery } = searchApi;
