import "./SubPlan.css";
export default function SubPlanCard({ plan }) {
  return (
    <div className="sub-plan-card">
      <h3>{plan.name}</h3>
      <p>{plan.description}</p>
      <ul>
        {Object.entries(plan.features).map(([feature, value]) => (
          <li key={feature}>
            <strong>{feature}:</strong>{" "}
            {value !== null ? value.toString() : "N/A"}
          </li>
        ))}
      </ul>
      <p>
        Precio: {plan.price} {plan.currency} / {plan.billingInterval}
      </p>
      <button className="subscribe-button">Suscribirse</button>
    </div>
  );
}
