import { useAuthStore } from "../../store/authStore.js";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({
  children,
  redirectTo,
  requireAuth = true, // true = solo usuarios autenticados; false = solo invitados
}) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) {
    // Puedes mostrar un indicador de carga mientras se verifica la autenticación
    return <div className="loading"></div>;
  }
  // Ruta privada: si NO está autenticado → redirige
  if (requireAuth && !isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // Ruta pública (login/register): si YA está autenticado → redirige
  if (!requireAuth && isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
