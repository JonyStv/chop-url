import "./Settings.css";
import { useAuthStore } from "../../store/authStore";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotificationStore } from "../../store/notificationStore";
import { apiJson, apiFetch } from "../../config/api.js";
import SubPlan from "../../components/SubPlan/SubPlan.jsx";
import SettingsForm from "../../pages/Settings/SettingsForm.jsx";
import BillingHistoryModal from "../../components/BillingHistoryModal/BillingHistoryModal.jsx";
import PlanChangeModal from "../../components/PlanChangeModal/PlanChangeModal.jsx";
import { useUsage } from "../../context/UsageContext.jsx";

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
  const { user, accessToken, logout, refreshSubscriptionStatus } = useAuthStore();
  const notify = useNotificationStore((s) => s.notify);
  const { usage, isLoading: isUsageLoading } = useUsage();

  const [isSubVisible, setIsSubVisible] = useState(false);
  const [plans, setPlans] = useState([]);
  const [billingSummary, setBillingSummary] = useState(null);
  const [isBillingVisible, setIsBillingVisible] = useState(false);
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [isRenewalModalVisible, setIsRenewalModalVisible] = useState(false);
  const [isScheduledPlanNoticeExpanded, setIsScheduledPlanNoticeExpanded] =
    useState(false);
  const subscriptionStatus = user?.subscription_status || "active";
  const statusMeta = getPlanStatusMeta(subscriptionStatus);
  const currentPlanId = user?.plan_id || "free";
  const isFree = currentPlanId === "free";
  const plan = plans.find((p) => p.id === currentPlanId);
  const currentPlanName = plan?.name || user?.plan_name || "Gratuito";
  const raw = plan?.features.maxLinks;
  const currentLimitedLinks = raw === null ? Infinity : raw ?? 0;
  const currentLimitedClicks = usage?.clicks?.limit ?? null;
  const currentPlanDueDate = user?.subscription_period_end && !isFree ? new Date(user.subscription_period_end).toLocaleDateString('es-ES' ) : "";
  const subCancelAtPeriodEnd = user?.subscription_cancel_at_period_end || false;
  const scheduledPlanName = user?.scheduled_plan_name;
  const scheduledPlanPrice = user?.scheduled_plan_price;
  const scheduledPlanCurrency = user?.scheduled_plan_currency || "EUR";
  const scheduledPlanEffectiveAt = user?.scheduled_plan_effective_at
    ? new Date(user.scheduled_plan_effective_at).toLocaleDateString("es-ES")
    : null;
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

  useEffect(() => {
    if (!user?.id) return;
    apiJson("/subscriptions/billing-summary")
      .then(setBillingSummary)
      .catch(() => setBillingSummary(null));
  }, [user?.id]);

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
console.log(user);
  const handleCancelSubscription = async () => {
    try {
      await apiJson("/subscriptions/cancel", { method: "POST" });
      await refreshSubscriptionStatus();
      setIsCancelModalVisible(false);
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
      await apiJson("/subscriptions/reactivate", {
        method: "POST",
      });

      await refreshSubscriptionStatus();
      setIsRenewalModalVisible(false);
      notify.success("Tu suscripción ha sido reactivada correctamente.");
    } catch (error) {
      notify(error.message || "No se pudo reactivar la suscripción.", "error");
    }
  };

  return (
    <div className="settings-page">
      <section className="ajustes-header-section">
        <h1>Ajustes</h1>
        <p>Administra tu perfil, seguridad y preferencias.</p>
      </section>

      <section className="ajustes-section profile-section">
        <SettingsForm model="profile" />
        <SettingsForm model="security" />
      </section>

      <section className="ajustes-section subscription-section">
        <header className="subscription-header">
          <h3>Suscripción</h3>
        </header>

        <div className="subscription-info">
          <div className="info-card">
            <div className="plan-summary">
              <h4>Plan actual</h4>
              <span className={`status-badge status-${statusMeta.tone}`}>
                {statusMeta.label}
              </span>
            </div>
            <div className="plan-summary">
              <h2 className="plan-name">{currentPlanName}</h2>
              {!isFree && (
              <h3 className="plan-due-date">{(subCancelAtPeriodEnd? "Finaliza: " : "Siguiente Pago: ") + currentPlanDueDate }</h3>
              )}
              </div>

            <p className="status-message">{statusMeta.message}</p>
            {scheduledPlanName && scheduledPlanEffectiveAt && (
              <div
                className={`scheduled-plan-notice ${
                  isScheduledPlanNoticeExpanded ? "expanded" : ""
                }`}
                role="status"
              >
                <button
                  type="button"
                  className="scheduled-plan-notice-toggle"
                  aria-expanded={isScheduledPlanNoticeExpanded}
                  aria-controls="scheduled-plan-notice-details"
                  onClick={() =>
                    setIsScheduledPlanNoticeExpanded((expanded) => !expanded)
                  }
                >
                  <strong>Cambio de plan programado</strong>
                  <span aria-hidden="true">
                    {isScheduledPlanNoticeExpanded ? "▲" : "▼"}
                  </span>
                </button>
                {isScheduledPlanNoticeExpanded && (
                  <div id="scheduled-plan-notice-details">
                    <span>
                      Tu plan cambiará a <strong>{scheduledPlanName}</strong>{" "}
                      el <strong>{scheduledPlanEffectiveAt}</strong>, al
                      finalizar el ciclo actual.
                    </span>
                    {scheduledPlanPrice !== null &&
                      scheduledPlanPrice !== undefined && (
                        <span>
                          A partir de esa fecha pagarás{" "}
                          <strong>
                            {new Intl.NumberFormat("es-ES", {
                              style: "currency",
                              currency: scheduledPlanCurrency,
                            }).format(scheduledPlanPrice)}
                          </strong>{" "}
                          por ciclo.
                        </span>
                      )}
                  </div>
                )}
              </div>
            )}
            {billingSummary && (
              <div className="billing-balance-summary">
                <span>Saldo para futuras facturas</span>
                <strong>
                  {billingSummary.balance > 0 ? "-" : billingSummary.balance < 0 ? "+" : ""}
                  {new Intl.NumberFormat("es-ES", {
                    style: "currency",
                    currency: billingSummary.currency || "EUR",
                  }).format(Math.abs(billingSummary.balance || 0) / 100)}
                </strong>
              </div>
            )}

            <div className="subscription-actions">
              <button
                className="upgrade-button"
                onClick={() => setIsSubVisible((v) => !v)}
              >
                {isSubVisible ? "Ocultar planes" : "Actualizar Plan"}
              </button>
              <button
                className="upgrade-button"
                onClick={() => setIsBillingVisible(true)}
              >
                Ver pagos y próximo cobro
              </button>
              {/* Botón para gestionar la facturación (Unavailable) */}
              {!isFree && false && (
                <button
                  className="upgrade-button"
                  onClick={async () => {
                    try {
                      const data = await apiJson("/subscriptions/billing-portal", {
                        method: "POST",
                      });
                      if (data?.url) {
                        window.location.href = data.url;
                      } else {
                        notify.error("No se pudo abrir el portal de facturación");
                      }
                    } catch (error) {
                      notify.error(error.message || "No se pudo abrir el portal de facturación");
                    }
                  }}
                >
                  Gestionar facturación
                </button>
              )}

              {!subCancelAtPeriodEnd && !isFree && (
                <button
                  className="upgrade-button danger-button"
                  onClick={() => setIsCancelModalVisible(true)}
                >
                  Cancelar suscripción
                </button>
              )}

              {subCancelAtPeriodEnd && currentPlanId !== "free" && (
                <button
                  className="upgrade-button"
                  onClick={() => setIsRenewalModalVisible(true)}
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
              <strong>{currentLimitedLinks === Infinity ? "Ilimitado" : currentLimitedLinks}</strong>
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
            <h4>Límites de click</h4>
            <div className="usage-row">
              <span>Clicks este mes</span>
              <strong>
                {isUsageLoading
                  ? "Cargando..."
                  : (usage?.clicks?.current ?? 0).toLocaleString("es-ES")}
              </strong>
            </div>
            <div className="usage-row">
              <span>Límite de clicks</span>
              <strong>
                {usage?.clicks?.unlimited
                  ? "Ilimitado"
                  : (currentLimitedClicks ?? 0).toLocaleString("es-ES")}
              </strong>
            </div>
            {currentLimitedClicks !== null && currentLimitedClicks > 0 && (
              <div className="usage-bar">
                <div
                  className="usage-bar-fill"
                  style={{
                    width: `${Math.min(
                      100,
                      usage?.clicks?.percentage ?? 0,
                    )}%`,
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {isSubVisible && <SubPlan plans={plans} />}
        {isCancelModalVisible && plan && (
          <PlanChangeModal
            currentPlan={{
              ...plan,
              periodEnd: user?.subscription_period_end,
            }}
            plan={plan}
            cancellation
            onClose={() => setIsCancelModalVisible(false)}
            onSelect={handleCancelSubscription}
          />
        )}
        {isRenewalModalVisible && plan && (
          <PlanChangeModal
            currentPlan={{
              ...plan,
              periodEnd: user?.subscription_period_end,
            }}
            plan={plan}
            renewal
            onClose={() => setIsRenewalModalVisible(false)}
            onSelect={handleReactivateSubscription}
          />
        )}
        {isBillingVisible && (
          <BillingHistoryModal onClose={() => setIsBillingVisible(false)} />
        )}
      </section>

      <button onClick={handleDeleteAccount} className="delete-account-button">
        Eliminar Cuenta
      </button>
    </div>
  );
}

export default Settings;
