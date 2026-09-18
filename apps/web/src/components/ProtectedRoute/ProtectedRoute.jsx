import { useAuthStore } from "../../store/authStore.js";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({
  children,
  redirectTo,
  requireAuth = true, // true = solo usuarios autenticados; false = solo invitados
}) {
  const { isAuthenticated } = useAuthStore();

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
