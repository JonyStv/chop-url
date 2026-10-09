import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiJson } from "../config/api.js";
import { useAuthStore } from "../store/authStore.js";

const UsageContext = createContext(null);

export function UsageProvider({ children }) {
  const userId = useAuthStore((state) => state.user?.id);
  const [usage, setUsage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshUsage = useCallback(async () => {
    if (!userId) {
      setUsage(null);
      return null;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await apiJson("/subscriptions/usage");
      setUsage(data);
      return data;
    } catch (requestError) {
      setError(requestError);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  return (
    <UsageContext.Provider value={{ usage, isLoading, error, refreshUsage }}>
      {children}
    </UsageContext.Provider>
  );
}

export function useUsage() {
  const context = useContext(UsageContext);
  if (!context) {
    throw new Error("useUsage debe utilizarse dentro de UsageProvider");
  }
  return context;
}
