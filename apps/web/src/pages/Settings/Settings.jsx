import "./Settings.css";
import { useAuthStore } from "../../store/authStore";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotificationStore } from "../../store/notificationStore";
import { apiJson, apiFetch } from "../../config/api.js";
import SubPlan from "../../components/SubPlan/SubPlan.jsx";
import SettingsForm from "../../pages/Settings/SettingsForm.jsx";

const getPlanStatusMeta = (status = "active") => {
  const normalized = String(status || "active").toLowerCase();

  const map = {
    active: {
      label: "Activa",
      message: "Tu plan está activo y puedes usar todas las funciones.",
      tone: "active",
    },
    trialing: {
      label: "Periodo de prueba",
      message: "Estás en periodo de prueba con acceso completo.",
      tone: "trial",
    },
    cancel_at_period_end: {
      label: "Cancelación pendiente",
      message:
        "Tu suscripción permanecerá activa hasta el final del periodo actual.",
      tone: "warning",
    },
    past_due: {
      label: "Pago pendiente",
      message:
        "Hay un problema con tu pago; reactiva la suscripción para continuar.",
      tone: "danger",
    },
    canceled: {
      label: "Cancelada",
      message:
        "Tu suscripción está cancelada. Puedes reactivarla cuando quieras.",
      tone: "muted",
    },
    inactive: {
      label: "Inactiva",
      message: "Tu suscripción no está activa en este momento.",
      tone: "danger",
    },
  };

  return (
    map[normalized] || {
      label: "Activa",
      message: "Tu plan está activo y puedes usar todas las funciones.",
      tone: "active",
    }
  );
};

function Settings() {
  const navigate = useNavigate();
  const { user, accessToken, logout, refreshSubscriptionStatus } =
    useAuthStore();
  const notify = useNotificationStore((s) => s.notify);

  const [isSubVisible, setIsSubVisible] = useState(false);
  const [plans, setPlans] = useState([]);
  const subscriptionStatus = user?.subscription_status || "active";
  const statusMeta = getPlanStatusMeta(subscriptionStatus);
  const currentPlanId = user?.plan_id || "free";
  const currentPlanName =
    plans.find((plan) => plan.id === currentPlanId)?.name ||
    user?.plan_name ||
    "Gratuito";
  const currentLimitedLinks =
    plans.find((plan) => plan.id === currentPlanId)?.max_links ??
    user?.limite_enlaces ??
    0;
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await apiFetch("/plans");
        if (response.ok) {
          const data = await response.json();
          setPlans(data);
        }
      } catch (error) {
        console.error("Error fetching plans:", error);
      }
    };

    fetchPlans();
  }, []);

  useEffect(() => {
    if (user?.id) {
      refreshSubscriptionStatus();
    }
  }, [user?.id, refreshSubscriptionStatus]);

  const handleDeleteAccount = async () => {
    const ok = await notify.confirm(
      "Esta acción eliminará tu cuenta permanentemente. Por favor, confirma.",
    );

    if (!ok || !user) return;

    try {
      await apiJson(`/users/${user.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      notify("Cuenta eliminada exitosamente", "success");
      logout();
      navigate("/identify");
    } catch (error) {
      console.error("Error eliminando la cuenta:", error);
      notify("Error eliminando la cuenta", "error");
    }
  };

  const handleCancelSubscription = async () => {
    const confirmed = await notify.confirm(
      "¿Quieres cancelar tu suscripción? Se mantendrá activa hasta el final del periodo actual.",
    );

    if (!confirmed) return;

    try {
      await apiJson("/subscriptions/cancel", { method: "POST" });
      await refreshSubscriptionStatus();
      notify.success(
        "Tu suscripción se ha programado para cancelarse al final del periodo.",
      );
    } catch (error) {
      notify(error.message || "No se pudo cancelar la suscripción.", "error");
    }
  };

  const handleReactivateSubscription = async () => {
    if (currentPlanId === "free") {
      notify.info(
        "El plan gratuito ya está activo y no requiere reactivación.",
      );
      return;
    }

    try {
      const response = await apiJson("/subscriptions/checkout", {
        method: "POST",
        body: JSON.stringify({ planId: currentPlanId }),
      });

      if (response.url) {
        window.location.href = response.url;
        return;
      }

      notify.error("No se pudo iniciar la reactivación del plan.");
    } catch (error) {
      notify(error.message || "No se pudo reactivar la suscripción.", "error");
    }
  };

  const canCancel = ["active", "trialing", "cancel_at_period_end"].includes(
    subscriptionStatus,
  );

  return (
    <div className="settings-page">
      <section className="ajustes-header-section">
        <h1>Ajustes</h1>
        <p>Administra tu perfil, seguridad y preferencias.</p>
      </section>

      <section className="ajustes-section">
        <SettingsForm model="profile" />
        <SettingsForm model="security" />
      </section>

      <section className="ajustes-section subscription-section">
        <header className="subscription-header">
          <h3>Suscripción</h3>
        </header>

        <div className="subscription-info">
          <div className="info-card">
            <h4>Plan actual</h4>
            <div className="plan-summary">
              <p className="plan-name">{currentPlanName}</p>
              <span className={`status-badge status-${statusMeta.tone}`}>
                {statusMeta.label}
              </span>
            </div>

            <p className="status-message">{statusMeta.message}</p>

            <div className="subscription-actions">
              <button
                className="upgrade-button"
                onClick={() => setIsSubVisible((v) => !v)}
              >
                {isSubVisible ? "Ocultar planes" : "Actualizar Plan"}
              </button>

              {canCancel && (
                <button
                  className="upgrade-button danger-button"
                  onClick={handleCancelSubscription}
                >
                  Cancelar suscripción
                </button>
              )}

              {!canCancel && currentPlanId !== "free" && (
                <button
                  className="upgrade-button"
                  onClick={handleReactivateSubscription}
                >
                  Reactivar suscripción
                </button>
              )}
            </div>
          </div>

          <div className="info-card">
            <h4>Límites de uso</h4>
            <div className="usage-row">
              <span>Enlaces creados</span>
              <strong>{user?.enlaces_creados || 0}</strong>
            </div>
            <div className="usage-row">
              <span>Límite de enlaces</span>
              <strong>{currentLimitedLinks}</strong>
            </div>
            {currentLimitedLinks > 0 && (
              <div className="usage-bar">
                <div
                  className="usage-bar-fill"
                  style={{
                    width: `${Math.min(
                      100,
                      ((user?.enlaces_creados || 0) / currentLimitedLinks) * 100,
                    )}%`,
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {isSubVisible && <SubPlan plans={plans} />}
      </section>

      <button onClick={handleDeleteAccount} className="delete-account-button">
        Eliminar Cuenta
      </button>
    </div>
  );
}

export default Settings;
