import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IUser } from '../../types';

interface AuthState {
  user: IUser | null;
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;
}

const STORAGE_KEY = 'tf_auth';

function loadStored(): { user: IUser | null; accessToken: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: null, accessToken: null };
    const parsed = JSON.parse(raw);
    return { user: parsed.user ?? null, accessToken: parsed.accessToken ?? null };
  } catch {
    return { user: null, accessToken: null };
  }
}

function persist(user: IUser | null, accessToken: string | null) {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, accessToken }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch { /* storage not available */ }
}

const stored = loadStored();

const initialState: AuthState = {
  user: stored.user,
  accessToken: stored.accessToken,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: IUser; accessToken: string }>) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.error = null;
      persist(action.payload.user, action.payload.accessToken);
    },
    setTokens: (state, action: PayloadAction<{ accessToken: string }>) => {
      state.accessToken = action.payload.accessToken;
      persist(state.user, action.payload.accessToken);
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      persist(null, null);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    updateUser: (state, action: PayloadAction<Partial<IUser>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        persist(state.user, state.accessToken);
      }
    },
  },
});

export const { setCredentials, setTokens, logout, setLoading, setError, updateUser } = authSlice.actions;
export default authSlice.reducer;
