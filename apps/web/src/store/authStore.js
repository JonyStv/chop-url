import { create } from "zustand";
import { apiFetch } from "../config/api.js";
let initPromise = null; // Para evitar múltiples llamadas simultáneas a initAuth
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
    // Si ya hay una ejecución en curso, reutilízala
    if (initPromise) return initPromise;

    initPromise = (async () => {
      set({ isLoading: true });
      try {
        const check = await apiFetch("/auth/session");

        if (check.status === 204) {
          set({
            accessToken: null,
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
          return;
        }

        const refreshRes = await apiFetch("/auth/refresh", { method: "POST" });
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
      } finally {
        initPromise = null; // permite reintentar en el futuro (p.ej. tras logout)
      }
    })();

    return initPromise;
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
