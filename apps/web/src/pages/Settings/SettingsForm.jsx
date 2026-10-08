import { useAuthStore } from "../../store/authStore";
import { useNotificationStore } from "../../store/notificationStore";
import { useState } from "react";
import { apiJson } from "../../config/api";
import {useEffect} from "react";

const REGEX_EMAIL =
  /[-A-Za-z0-9!#$%&'*+/=?^_`{|}~]+(?:\.[-A-Za-z0-9!#$%&'*+/=?^_`{|}~]+)*@(?:[A-Za-z0-9](?:[-A-Za-z0-9]*[A-Za-z0-9])?\.)+[A-Za-z0-9](?:[-A-Za-z0-9]*[A-Za-z0-9])?/;


export default function SettingsForm({ model }) {
  const { user,setUser, setAccessToken, accessToken } = useAuthStore();
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const isEmailVerified = user?.email_verified_at ? true : false;
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
        notify("Usuario actualizado satisfactoriamente", "success");
        console.log("User updated:", data);
        setUser(data);
      })
      .catch((error) => {
        console.error("Error updating user:", error);
        if (error.message.includes("Unique constraint failed")) {
          notify("El correo electrónico ya está en uso", "error");
        } else {
          notify("Error updating user", "error");
        }
      })
      .finally(() => {
        setNameInput("");
        setEmailInput("");
      });
  };
  const sendVerificationEmail = async (email) => {
      try {
        const response = await apiJson("/auth/resend-verification-email", {
          method: "POST",
          body: JSON.stringify({ email }),
        });
        notify("Correo de verificación enviado.", "success");
        console.log("Correo de verificación enviado:", response);
      } catch (error) {
        console.error("Error al enviar el correo de verificación:", error.message);
        notify("Error al enviar el correo de verificación.", "error");
      }
    };
  return (
    <div>
      {model === "profile" ? (
        <>
          <h3>Perfil</h3>
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
          <div className="settings-buttons">
            <button
              onClick={(e) => handleSaveChanges(nameInput, emailInput)}
              className={`save-changes-button${!nameInput && !emailInput ? " disabled" : ""}`}
              disabled={!nameInput && !emailInput}
            >
              Guardar Cambios
            </button>
            {!isEmailVerified && (
            <button
              onClick={(e) => sendVerificationEmail(user?.email)}
              className="send-verification-email-button"
            >
              Verificar Correo
            </button>
            )}
          </div>
        </>
      ) : (
        <>
          {" "}
          {/* 👈 fragmento */}
          <h3>Seguridad</h3>
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
