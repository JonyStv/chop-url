import SubPlanCard from "../SubPlan/SubPlanCard.jsx";
import "./SubPlan.css";
import { useAuthStore } from "../../store/authStore.js";

export default function SubPlan({ plans = [] }) {
  const user = useAuthStore((state) => state.user);
  const currentPlan = plans.find((plan) => plan.id === user?.plan_id);
  return (
    <div className="sub-plan-container">
      {plans.map((plan) => (
        <SubPlanCard key={plan.id} plan={plan} currentPlan={currentPlan} />
      ))}
    </div>
  );
}
