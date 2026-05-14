import { configureStore } from '@reduxjs/toolkit';
import { authApi } from '../features/auth/authApi';
import { categoryApi } from '../features/categories/categoryApi';
import { taskerApi } from '../features/taskers/taskerApi';
import { taskApi } from '../features/tasks/taskApi';
import { chatApi } from '../features/chat/chatApi';
import { notificationApi } from '../features/notifications/notificationApi';
import { paymentApi } from '../features/payments/paymentApi';
import { reviewApi } from '../features/reviews/reviewApi';
import { disputeApi } from '../features/disputes/disputeApi';
import { adminApi } from '../features/admin/adminApi';
import { searchApi } from '../features/search/searchApi';
import authReducer from '../features/auth/authSlice';
import taskWizardReducer from '../features/tasks/taskSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    taskWizard: taskWizardReducer,
    [authApi.reducerPath]: authApi.reducer,
    [categoryApi.reducerPath]: categoryApi.reducer,
    [taskerApi.reducerPath]: taskerApi.reducer,
    [taskApi.reducerPath]: taskApi.reducer,
    [chatApi.reducerPath]: chatApi.reducer,
    [notificationApi.reducerPath]: notificationApi.reducer,
    [paymentApi.reducerPath]: paymentApi.reducer,
    [reviewApi.reducerPath]: reviewApi.reducer,
    [disputeApi.reducerPath]: disputeApi.reducer,
    [adminApi.reducerPath]: adminApi.reducer,
    [searchApi.reducerPath]: searchApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      categoryApi.middleware,
      taskerApi.middleware,
      taskApi.middleware,
      chatApi.middleware,
      notificationApi.middleware,
      paymentApi.middleware,
      reviewApi.middleware,
      disputeApi.middleware,
      adminApi.middleware,
      searchApi.middleware,
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
