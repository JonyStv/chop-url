import SubPlanCard from "../SubPlan/SubPlanCard.jsx";
import "./SubPlan.css";

export default function SubPlan({ plans = [] }) {
  return (
    <div className="sub-plan-container">
      {plans.map((plan) => (
        <SubPlanCard key={plan.id} plan={plan} />
      ))}
    </div>
  );
}
