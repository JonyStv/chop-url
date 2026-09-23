import "./Settings.css";
import { useAuthStore } from "../../store/authStore";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotificationStore } from "../../store/notificationStore";
import { apiJson, apiFetch } from "../../config/api.js";
import SubPlan from "../../components/SubPlan/SubPlan.jsx";
import SettingsForm from "../../pages/Settings/SettingsForm.jsx";

function Settings() {
  const navigate = useNavigate();
  const { user, accessToken, setAccessToken, logout } = useAuthStore();
  const notify = useNotificationStore((s) => s.notify);

  const [isSubVisible, setIsSubVisible] = useState(false);
  const [plans, setPlans] = useState([]);
  //Fetch Plans from API
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
  const handleDeleteAccount = async () => {
    const ok = await notify.confirm(
      "Esta acción eliminará tu cuenta permanentemente. Por favor, confirma.",
    );
    if (ok) {
      await apiJson(`/users/${user.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((data) => {
          notify("Cuenta eliminada exitosamente", "success");
          console.log("Cuenta eliminada:", data);
          logout();
          navigate("/identify"); // Redirige al usuario a la página de logout o inicio de sesión
        })
        .catch((error) => {
          console.error("Error eliminando la cuenta:", error);
          notify("Error eliminando la cuenta", "error");
        });
    }
  };
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
            <p className="plan-name">{user?.plan || "Gratuito"}</p>
            <button
              className="upgrade-button"
              onClick={() => setIsSubVisible((v) => !v)}
            >
              {isSubVisible ? "Ocultar planes" : "Actualizar Plan"}
            </button>
          </div>

          <div className="info-card">
            <h4>Límites de uso</h4>
            <div className="usage-row">
              <span>Enlaces creados</span>
              <strong>{user?.enlacesCreados || 0}</strong>
            </div>
            <div className="usage-row">
              <span>Límite de enlaces</span>
              <strong>{user?.limite_enlaces || 0}</strong>
            </div>
            {user?.limiteEnlaces > 0 && (
              <div className="usage-bar">
                <div
                  className="usage-bar-fill"
                  style={{
                    width: `${Math.min(
                      100,
                      ((user?.enlacesCreados || 0) / user.limite_enlaces) * 100,
                    )}%`,
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {isSubVisible && <SubPlan plans={plans} />}
      </section>
      <button
        onClick={() => {
          handleDeleteAccount();
        }}
        className="delete-account-button"
      >
        Eliminar Cuenta
      </button>
    </div>
  );
}

export default Settings;
