import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotificationStore } from "../../store/notificationStore.js";

export default function BillingCancel() {
  const navigate = useNavigate();
  const notify = useNotificationStore((state) => state.notify);

  useEffect(() => {
    notify.info(
      "La compra fue cancelada. Puedes intentarlo de nuevo cuando quieras.",
    );
    navigate("/settings", { replace: true });
  }, [navigate, notify]);

  return (
    <div className="loading">
      <span></span>
    </div>
  );
}
