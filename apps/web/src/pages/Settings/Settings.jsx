import "./Settings.css";
import { useAuthStore } from "../../store/authStore";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotificationStore } from "../../store/notificationStore";
import { apiJson } from "../../config/api.js";
import SubPlan from "../../components/SubPlan/SubPlan.jsx";
const regexEmail =
  /[-A-Za-z0-9!#$%&'*+/=?^_`{|}~]+(?:\.[-A-Za-z0-9!#$%&'*+/=?^_`{|}~]+)*@(?:[A-Za-z0-9](?:[-A-Za-z0-9]*[A-Za-z0-9])?\.)+[A-Za-z0-9](?:[-A-Za-z0-9]*[A-Za-z0-9])?/;
function Settings() {
  const navigate = useNavigate();
  const { user, accessToken, setAccessToken, logout } = useAuthStore();
  const notify = useNotificationStore((s) => s.notify);
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const handleSaveChanges = (name, email) => {
    if (!name && !email) {
      notify(
        "Debes ingresar un nombre o correo electrónico para actualizar",
        "error",
      );
      return;
    }
    if (!regexEmail.test(email)) {
      notify("Formato de correo electrónico inválido", "error");
      return;
    }
    apiJson(`/users/${user.id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        nombre: name || user.nombre,
        email: email || user.email,
      }),
    })
      .then((data) => {
        notify("User updated successfully", "success");
        console.log("User updated:", data);
      })
      .catch((error) => {
        console.error("Error updating user:", error);
      });
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      notify("Completa ambas contraseñas", "error");
      return;
    }

    try {
      const data = await apiJson("/auth/change-password", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      notify(data.message, "success");
      setAccessToken(data.accessToken); // Actualiza el accessToken en el store
      // El backend devuelve un nuevo accessToken
      // Debes actualizarlo en authStore si tu store tiene esta función:
      // useAuthStore.getState().setAccessToken(data.accessToken);
    } catch (error) {
      console.error("Error changing password:", error);
      notify(error.message, "error");
    } finally {
      setCurrentPassword("");
      setNewPassword("");
    }
  };
  const handleChange = (e) => {
    const name = e.target.name;
    const value = e.target.value;
    switch (name) {
      case "nameInput":
        setNameInput(value);
        break;
      case "emailInput":
        setEmailInput(value);
        break;
      case "currentPassword":
        setCurrentPassword(value);
        break;
      case "newPassword":
        setNewPassword(value);
        break;
    }
  };
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
        <div>
          <h4>Perfil</h4>
          <p>
            Nombre Completo:{" "}
            <input
              name="nameInput"
              placeholder={user?.nombre || "Nombre Completo"}
              value={nameInput}
              onChange={(e) => handleChange(e)}
            />
          </p>
          <p>
            Correo Electrónico:
            <input
              name="emailInput"
              placeholder={user?.email || "johndoe@example.com"}
              value={emailInput}
              onChange={(e) => handleChange(e)}
            />
          </p>
          <button
            onClick={(e) => handleSaveChanges(nameInput, emailInput)}
            className={`save-changes-button${!nameInput && !emailInput ? " disabled" : ""}`}
            disabled={!nameInput && !emailInput}
          >
            Guardar Cambios
          </button>
        </div>
        <div>
          <h4>Seguridad</h4>
          <p>
            Contraseña actual:
            <input
              name="currentPassword"
              type="password"
              placeholder="Contraseña actual"
              value={currentPassword}
              onChange={(e) => handleChange(e)}
            />
          </p>
          <p>
            Cambiar Contraseña:
            <input
              name="newPassword"
              type="password"
              placeholder="Nueva Contraseña"
              value={newPassword}
              onChange={(e) => handleChange(e)}
            />
          </p>
          <button
            onClick={(e) => handleChangePassword()}
            disabled={!currentPassword || !newPassword}
            className={`change-password-button${!currentPassword || !newPassword ? " disabled" : ""}`}
          >
            Cambiar Contraseña
          </button>
        </div>
      </section>
      <section className="ajustes-section subscription-section">
        <div className="subscription-info">
          <div>
            <h4>Plan de Suscripción</h4>
            <p>Actualmente estás en el plan {user?.plan || "gratuito"}.</p>
            <button>Actualizar Plan</button>
          </div>
          <div>
            <h4>Limites de uso</h4>
            <p>Enlaces creados: {user?.enlacesCreados || 0}</p>
            <p>Límite de enlaces: {user?.limiteEnlaces || 0}</p>
          </div>
        </div>
        <SubPlan />
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
