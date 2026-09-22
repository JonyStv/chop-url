import "./SubPlan.css";
export default function SubPlanCard({ plan }) {
  return (
    <div className="sub-plan-card">
      <h3>{plan}</h3>
      <p>Acceso a funciones básicas y soporte estándar.</p>
      <ul>
        <li>Enlaces limitados</li>
        <li>Estadísticas básicas</li>
        <li>Soporte estándar</li>
      </ul>
      <button className="subscribe-button">Suscribirse</button>
    </div>
  );
}
