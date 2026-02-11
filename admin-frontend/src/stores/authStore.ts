import { create } from 'zustand';

interface AuthStore {
  token: string | null;
  isAuthenticated: boolean;
  setupRequired: boolean | null;
  
  setToken: (token: string) => void;
  clearToken: () => void;
  setSetupRequired: (required: boolean) => void;
  logout: () => void;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: null,
  isAuthenticated: false,
  setupRequired: null,

  setToken: (token: string) => {
    localStorage.setItem('admin_token', token);
    set({ token, isAuthenticated: true });
  },

  clearToken: () => {
    localStorage.removeItem('admin_token');
    set({ token: null, isAuthenticated: false });
  },

  setSetupRequired: (required: boolean) => {
    set({ setupRequired: required });
  },

  logout: () => {
    localStorage.removeItem('admin_token');
    set({ token: null, isAuthenticated: false });
  },

  initializeAuth: () => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      set({ token, isAuthenticated: true });
    }
  }
}));
