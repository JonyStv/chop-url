import { Outlet } from "react-router-dom";
import { useState } from "react";
import { useAuthStore } from "../store/authStore.js";
import { useNotificationStore } from "../store/notificationStore.js";
import { apiJson } from "../config/api.js";
import "./RequireVerifiedEmail.css";

export default function RequireVerifiedEmail({ children }) {
  const user = useAuthStore((state) => state.user);
  const notify = useNotificationStore((s) => s.notify);
  const [isSending, setIsSending] = useState(false);

  const isUnverified = Boolean(user && user.email_verified_at === null);

  const handleResendEmail = async () => {
    if (!user?.email) return;
    setIsSending(true);
    try {
      await apiJson("/auth/resend-verification-email", {
        method: "POST",
        body: JSON.stringify({ email: user.email }),
      });
      notify.success("Correo de verificación enviado. Revisa tu bandeja de entrada.");
    } catch (error) {
      notify.error(error.message || "Error al reenviar el correo de verificación.");
    } finally {
      setIsSending(false);
    }
  };

  const content = children || <Outlet />;

  if (!isUnverified) {
    return content;
  }

  return (
    <div className="verified-email-wrapper">
      <div className="verified-email-blurred-content">
        {content}
      </div>
      <div className="verified-email-overlay">
        <div className="verified-email-card">
          <div className="verified-email-icon">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <h2>Verificación requerida</h2>
          <p>
            Para acceder a estas acciones debes verificar el correo.
          </p>
          {user?.email && (
            <p className="verified-email-address">
              Enviado a: <strong>{user.email}</strong>
            </p>
          )}
          <button
            className="resend-email-button"
            onClick={handleResendEmail}
            disabled={isSending}
          >
            {isSending ? "Enviando..." : "Reenviar correo de verificación"}
          </button>
        </div>
      </div>
    </div>
  );
}

