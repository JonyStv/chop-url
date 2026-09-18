import { create } from "zustand";
import { apiFetch } from "../config/api.js";

export const useAuthStore = create((set, get) => ({
  isAuthenticated: false,
  user: null,
  accessToken: null,
  isLoading: true, // nuevo: para mostrar loading mientras se verifica la sesión

  setAccessToken: (token) => set({ accessToken: token }),
  setUser: (user) => set({ user }),
  setIsAuthenticated: (value) => set({ isAuthenticated: value }),

  // Intenta restaurar la sesión usando la cookie refreshToken
  initAuth: async () => {
    try {
      const check = await apiFetch("/auth/session");

      // 204 = no hay sesión → no intentamos refresh
      if (check.status === 204) {
        return set({
          accessToken: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }

      // hay sesión → ahora sí refresh
      const refreshRes = await apiFetch("/auth/refresh", {
        method: "POST",
      });
      if (!refreshRes.ok) throw new Error("No refresh");

      const { accessToken } = await refreshRes.json();

      const meRes = await apiFetch("/auth/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!meRes.ok) throw new Error("Failed to get user");

      const { user } = await meRes.json();
      set({ accessToken, user, isAuthenticated: true, isLoading: false });
    } catch {
      set({
        accessToken: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  // Cerrar sesión (centralizado)
  logout: async () => {
    try {
      await apiFetch("/auth/logout", {
        method: "POST",
      });
    } catch {
      /* silenciar */
    }
    set({ accessToken: null, user: null, isAuthenticated: false });
  },
}));
