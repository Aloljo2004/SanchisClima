import { create } from 'zustand';

interface AuthState {
  uid: number | null;
  sessionId: string | null;
  username: string | null;
  userFullName: string | null;
  companyIds: number[];
  isAuthenticated: boolean;
  setSession: (uid: number, sessionId: string, username: string, fullName: string, companyIds?: number[]) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  uid: null,
  sessionId: null,
  username: null,
  userFullName: null,
  companyIds: [],
  isAuthenticated: false,

  setSession: (uid, sessionId, username, fullName, companyIds = []) =>
    set({ uid, sessionId, username, userFullName: fullName, companyIds, isAuthenticated: true }),

  clearSession: () =>
    set({ uid: null, sessionId: null, username: null, userFullName: null, companyIds: [], isAuthenticated: false }),
}));
