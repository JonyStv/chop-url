import SubPlanCard from "../SubPlan/SubPlanCard.jsx";

export default function SubPlan() {
  return (
    <div className="sub-plan-container">
      <SubPlanCard plan="Gratuito" />
      <SubPlanCard plan="Pro" />
      <SubPlanCard plan="Premium" />
    </div>
  );
}
