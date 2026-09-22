import { apiFetch } from "../../config/api.js";
import SubPlanCard from "../SubPlan/SubPlanCard.jsx";
import { useState, useEffect } from "react";
import "./SubPlan.css";
export default function SubPlan() {
  const [plans, setPlans] = useState([]);
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await apiFetch("/plans");
        if (response.ok) {
          const data = await response.json();
          setPlans(data);
        } else {
          console.error("Error fetching plans:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching plans:", error);
      }
    };

    fetchPlans();
  }, []);
  return (
    <div className="sub-plan-container">
      <SubPlanCard plan={plans[0]} />
      <SubPlanCard plan={plans[1]} />
      <SubPlanCard plan={plans[2]} />
    </div>
  );
}
