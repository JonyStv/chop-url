import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../store/authStore.js";
import { useNotificationStore } from "../../store/notificationStore.js";
import { apiJson } from "../../config/api.js";

export default function BillingSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { refreshSubscriptionStatus } = useAuthStore();
  const notify = useNotificationStore((state) => state.notify);

  useEffect(() => {
    const finalize = async () => {
      try {
        if (sessionId) {
          await apiJson("/subscriptions/checkout/confirm", {
            method: "POST",
            body: JSON.stringify({ sessionId }),
          });
        }
        await refreshSubscriptionStatus();
        notify.success("Tu suscripción se ha actualizado correctamente.");
        navigate("/settings", { replace: true });
      } catch (error) {
        notify.error(error.message || "No se pudo actualizar tu suscripción.");
        navigate("/settings", { replace: true });
      }
    };

    finalize();
  }, [sessionId, refreshSubscriptionStatus, navigate, notify]);

  return (
    <div className="loading">
      <span></span>
    </div>
  );
}
