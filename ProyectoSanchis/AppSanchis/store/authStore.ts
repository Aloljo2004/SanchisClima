import { create } from 'zustand';

interface AuthState {
  uid: number | null;
  sessionId: string | null;
  username: string | null;
  userFullName: string | null;
  isAuthenticated: boolean;
  setSession: (uid: number, sessionId: string, username: string, fullName: string) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  uid: null,
  sessionId: null,
  username: null,
  userFullName: null,
  isAuthenticated: false,

  setSession: (uid, sessionId, username, fullName) =>
    set({ uid, sessionId, username, userFullName: fullName, isAuthenticated: true }),

  clearSession: () =>
    set({ uid: null, sessionId: null, username: null, userFullName: null, isAuthenticated: false }),
}));
