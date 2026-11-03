import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            _hasHydrated: false,

            setHasHydrated: (val) => set({ _hasHydrated: val }),

            login: (user, token) => {
                localStorage.setItem('token', token);
                set({ user, token, isAuthenticated: true });
            },

            logout: () => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                set({ user: null, token: null, isAuthenticated: false });
            },

            updateUser: (user) => set({ user }),

            setUser: (user) => set({ user }),
        }),
        {
            name: 'auth-storage',
            onRehydrateStorage: () => (state) => {
                if (state) {
                    // Sanitize corrupt storage: require both token and user
                    if (!state.token || !state.user) {
                        state.user = null;
                        state.token = null;
                        state.isAuthenticated = false;
                        localStorage.removeItem('token');
                    } else {
                        state.isAuthenticated = true;
                    }
                    state.setHasHydrated(true);
                }
            }
        }
    )
);
