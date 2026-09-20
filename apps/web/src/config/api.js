const configuredApiUrl = import.meta.env.VITE_API_URL || "/api";

export const API_URL = configuredApiUrl.replace(/\/$/, "");

export const apiFetch = (path, options = {}) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const headers = new Headers(options.headers || {});

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${API_URL}${normalizedPath}`, {
    ...options,
    headers,
    credentials: "include",
  });
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
