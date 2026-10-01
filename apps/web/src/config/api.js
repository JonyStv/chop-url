const configuredApiUrl = import.meta.env.VITE_API_URL || "/api";

export const API_URL = configuredApiUrl.replace(/\/$/, "");

const getStoredAccessToken = () => {
  try {
    return localStorage.getItem("accessToken");
  } catch {
    return null;
  }
};

export const apiFetch = async (path, options = {}) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const headers = new Headers(options.headers || {});
  const accessToken = getStoredAccessToken();

  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const requestOptions = {
    ...options,
    headers,
    credentials: "include",
  };

  let response = await fetch(`${API_URL}${normalizedPath}`, requestOptions);

  if (
    response.status === 401 &&
    !options._retry &&
    normalizedPath !== "/auth/refresh" &&
    normalizedPath !== "/auth/session"
  ) {
    try {
      const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (refreshRes.ok) {
        const { accessToken: nextAccessToken } = await refreshRes.json();

        if (nextAccessToken) {
          try {
            localStorage.setItem("accessToken", nextAccessToken);
          } catch {
            // localStorage no disponible
          }

          const retryHeaders = new Headers(options.headers || {});
          retryHeaders.set("Authorization", `Bearer ${nextAccessToken}`);

          if (options.body && !retryHeaders.has("Content-Type")) {
            retryHeaders.set("Content-Type", "application/json");
          }

          return fetch(`${API_URL}${normalizedPath}`, {
            ...options,
            headers: retryHeaders,
            credentials: "include",
            _retry: true,
          });
        }
      }
    } catch (error) {
      console.warn("No se pudo refrescar el token de acceso:", error);
    }

    try {
      localStorage.removeItem("accessToken");
    } catch {
      // localStorage no disponible
    }
  }

  return response;
};

export const apiJson = async (path, options = {}) => {
  const response = await apiFetch(path, options);
  const data = response.status === 204 ? null : await response.json();
  console.log("apiJson response:", data);
  if (!response.ok) {
    throw new Error(data?.message || `Error HTTP ${response.status}`);
  }

  return data;
};
