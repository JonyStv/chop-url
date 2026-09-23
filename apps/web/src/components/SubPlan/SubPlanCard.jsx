import "./SubPlan.css";

const FEATURE_LABELS = {
  maxLinks: "Enlaces máximos",
  maxClicksPerMonth: "Clics por mes",
  analyticsRetentionDays: "Retención de analíticas (dias)",
  customSlug: "Slug personalizado",
  customDomain: "Dominio personalizado",
  apiAccess: "Acceso a la API",
  removeBranding: "Sin marca",
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

      <button className="subscribe-button">
        {isFree ? "Empezar gratis" : "Suscribirse"}
      </button>

      <ul className="features">
        {Object.entries(plan.features).map(([feature, value]) => (
          <li key={feature}>
            <span className="feature-label">
              {FEATURE_LABELS[feature] ?? feature}
            </span>
            <span className="feature-value">{formatValue(feature, value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
