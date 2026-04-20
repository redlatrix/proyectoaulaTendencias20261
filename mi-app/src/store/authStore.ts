import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../features/auth/api';
import type { User, AuthTokens, LoginRequest } from '../types';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isAdministrador: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isAdministrador: false,
      isLoading: false,
      error: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const { data: tokens } = await authApi.login(credentials);
          // Sync tokens for the Axios interceptor
          localStorage.setItem('access_token', tokens.access);
          localStorage.setItem('refresh_token', tokens.refresh);

          const { data: user } = await authApi.getMe();
          set({
            user,
            tokens,
            isAuthenticated: true,
            isAdministrador: user.is_superuser || user.groups.includes('Administrador'),
            isLoading: false,
          });
        } catch {
          set({ isLoading: false, error: 'Credenciales incorrectas. Intenta de nuevo.' });
        }
      },

      logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          isAdministrador: false,
          error: null,
        });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
        isAdministrador: state.isAdministrador,
      }),
      // Re-sync tokens to localStorage on page refresh
      onRehydrateStorage: () => (state) => {
        if (state?.tokens) {
          localStorage.setItem('access_token', state.tokens.access);
          localStorage.setItem('refresh_token', state.tokens.refresh);
        }
      },
    },
  ),
);
