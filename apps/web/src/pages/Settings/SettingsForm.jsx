import { useAuthStore } from "../../store/authStore";
import { useNotificationStore } from "../../store/notificationStore";
import { useState } from "react";

const REGEX_EMAIL =
  /[-A-Za-z0-9!#$%&'*+/=?^_`{|}~]+(?:\.[-A-Za-z0-9!#$%&'*+/=?^_`{|}~]+)*@(?:[A-Za-z0-9](?:[-A-Za-z0-9]*[A-Za-z0-9])?\.)+[A-Za-z0-9](?:[-A-Za-z0-9]*[A-Za-z0-9])?/;

export default function SettingsForm({ model }) {
  const { user } = useAuthStore();
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const notify = useNotificationStore((s) => s.notify);
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
    } catch (error) {
      console.error("Error changing password:", error);
      notify(error.message, "error");
    } finally {
      setCurrentPassword("");
      setNewPassword("");
    }
  };
  const handleSaveChanges = (name, email) => {
    if (!name && !email) {
      notify(
        "Debes ingresar un nombre o correo electrónico para actualizar",
        "error",
      );
      return;
    }
    if (!REGEX_EMAIL.test(email)) {
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
  return (
    <div>
      {model === "profile" ? (
        <>
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
        </>
      ) : (
        <>
          {" "}
          {/* 👈 fragmento */}
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
        </>
      )}
    </div>
  );
}
