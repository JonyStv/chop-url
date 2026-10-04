import "./SubPlan.css";
import { useAuthStore } from "../../store/authStore.js";
import { useNotificationStore } from "../../store/notificationStore.js";
import { apiJson } from "../../config/api.js";

const FEATURE_LABELS = {
  maxLinks: "Enlaces máximos",
  maxClicksPerMonth: "Clics por mes",
  analyticsRetentionDays: "Retención de analíticas (dias)",
  customSlug: "Slug personalizado",
  customDomain: "Dominio personalizado",
  // apiAccess: "Acceso a la API",
  // removeBranding: "Sin marca",
  exportData: "Exportar datos",
  supportLevel: "Soporte",
};

const SUPPORT_LABELS = {
  email: "Email",
  priority: "Prioritario",
  dedicated: "Dedicado",
};

function formatValue(key, value) {
  if (value === null) return "Ilimitado";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (key === "supportLevel") return SUPPORT_LABELS[value] ?? value;
  if (key === "maxClicksPerMonth") return value.toLocaleString("es-ES");
  return value.toString();
}

export default function SubPlanCard({ plan }) {
  const { user, refreshSubscriptionStatus } = useAuthStore();
  const notify = useNotificationStore((s) => s.notify);
  const handleUpdatePlan = async (planId) => {
    if (planId === user?.plan_id) {
      return notify.info("Ya estás suscrito a este plan");
    }

    const confirmed = await notify.confirm(
      `¿Estás seguro de que deseas cambiar al plan "${plan.name}?"`,
    );

    if (!confirmed) return;

    try {
      // Si el usuario tiene una suscripción activa en Stripe, usar /switch para cambio sin salir de la app
      const hasActiveStripe =
        user?.subscription_status &&
        ["active", "trialing", "cancel_at_period_end"].includes(user.subscription_status);

      if (hasActiveStripe) {
        // Downgrade a free: cancelación diferida (proration=none)
        const prorationBehavior = planId === "free" ? "none" : "create_prorations";

        const data = await apiJson("/subscriptions/switch", {
          method: "PATCH",
          body: JSON.stringify({ planId, prorationBehavior }),
        });

        if (data) {
          await refreshSubscriptionStatus();
          notify.success("Plan actualizado correctamente.");
        }
        return;
      }

      // Sin suscripción activa: usar checkout (ej. reactivación, nueva suscripción)
      const data = await apiJson("/subscriptions/checkout", {
        method: "POST",
        body: JSON.stringify({ planId }),
      });

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      notify.error("No se pudo iniciar el proceso de suscripción");
    } catch (error) {
      notify.error(error.message || "No se pudo iniciar el proceso de suscripción");
    }
  };
  const isFree = plan.price === 0;

  return (
    <div className={`sub-plan-card ${plan.id === "pro" ? "featured" : ""}`}>
      {plan.id === "pro" && <span className="badge">Más popular</span>}

      <div className="card-header">
        <h2>{plan.name}</h2>
        <p className="description">{plan.description}</p>
      </div>

      <div className="card-price">
        <span className="amount">{plan.price}€</span>
        <span className="period">
          / {plan.billingInterval === "month" ? "mes" : "año"}
        </span>
      </div>

      <button
        className={`subscribe-button ${plan.id === user?.plan_id ? "active" : ""}`}
        onClick={() => handleUpdatePlan(plan.id)}
        disabled={plan.id === user?.plan_id}
      >
        {plan.id === user?.plan_id
  ? "Plan actual"
  : isFree
    ? "Empezar gratis"
    : "Suscribirse" }
      </button>

      <ul className="features">
        {Object.entries(plan.features)
          .filter(([feature]) => feature in FEATURE_LABELS)
          .map(([feature, value]) => (
            <li key={feature}>
              <span className="feature-label">{FEATURE_LABELS[feature]}</span>
              <span className="feature-value">{formatValue(feature, value)}</span>
            </li>
          ))}
      </ul>
    </div>
  );
}
