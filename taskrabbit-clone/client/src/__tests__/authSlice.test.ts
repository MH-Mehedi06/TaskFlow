import { describe, it, expect } from 'vitest';
import authReducer, {
  setCredentials,
  setTokens,
  logout,
  setLoading,
  setError,
} from '../features/auth/authSlice';
import { IUser } from '../types';

const mockUser: IUser = {
  _id: 'user123',
  name: 'Alice',
  email: 'alice@example.com',
  role: 'client',
  isVerified: true,
  isActive: true,
  notifications: { email: true, push: true },
  createdAt: '2025-01-01T00:00:00.000Z',
};

describe('authSlice', () => {
  const initialState = { user: null, accessToken: null, isLoading: false, error: null };

  it('returns initial state', () => {
    expect(authReducer(undefined, { type: '@@INIT' })).toEqual(initialState);
  });

  describe('setCredentials', () => {
    it('sets user and accessToken', () => {
      const state = authReducer(initialState, setCredentials({ user: mockUser, accessToken: 'tok123' }));
      expect(state.user).toEqual(mockUser);
      expect(state.accessToken).toBe('tok123');
      expect(state.error).toBeNull();
    });

    it('clears previous error on successful credentials', () => {
      const withError = { ...initialState, error: 'previous error' };
      const state = authReducer(withError, setCredentials({ user: mockUser, accessToken: 'tok' }));
      expect(state.error).toBeNull();
    });
  });

  describe('setTokens', () => {
    it('updates only accessToken, leaving user intact', () => {
      const withUser = { ...initialState, user: mockUser, accessToken: 'old' };
      const state = authReducer(withUser, setTokens({ accessToken: 'new-token' }));
      expect(state.accessToken).toBe('new-token');
      expect(state.user).toEqual(mockUser);
    });
  });

  describe('logout', () => {
    it('clears user and accessToken', () => {
      const loggedIn = { user: mockUser, accessToken: 'tok', isLoading: false, error: null };
      const state = authReducer(loggedIn, logout());
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('sets isLoading flag', () => {
      const state = authReducer(initialState, setLoading(true));
      expect(state.isLoading).toBe(true);
    });
  });

  describe('setError', () => {
    it('sets error and clears isLoading', () => {
      const loading = { ...initialState, isLoading: true };
      const state = authReducer(loading, setError('Invalid credentials'));
      expect(state.error).toBe('Invalid credentials');
      expect(state.isLoading).toBe(false);
    });
  });
});
