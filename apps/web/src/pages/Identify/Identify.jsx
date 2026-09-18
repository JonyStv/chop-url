import "./Identify.css";
import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore.js";
import { apiJson } from "../../config/api.js";
import { useNotificationStore } from "../../store/notificationStore.js";

function Identify() {
  const notify = useNotificationStore((state) => state.notify);
  const [isRegisterFormVisible, setIsRegisterFormVisible] = useState(false);
  const navigate = useNavigate();
  // Estados Formulario Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Estados Formulario Registro
  const [regUser, setRegUser] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");

  const { user, setUser, setIsAuthenticated, setAccessToken } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleSuccessfulIdentification = (data) => {
    setUser(data.user);
    setIsAuthenticated(true);
    setAccessToken(data.accessToken);
    navigate("/");
  };
  const handleLoginSubmit = (event) => {
    setLoading(true);
    event.preventDefault();
    apiJson("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
      .then((data) => {
        handleSuccessfulIdentification(data);
        console.log("Inicio de sesión exitoso:", data);
      })
      .catch((error) => {
        notify(error.message, "error");
        console.error("Error en el inicio de sesión:", error.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleRegisterSubmit = (event) => {
    setLoading(true);
    event.preventDefault();
    if (!regUser || !regEmail || !regPassword || !regConfirmPassword) {
      notify("Todos los campos son obligatorios.", "error");
      console.error("Todos los campos son obligatorios.");
      setLoading(false);
      return;
    }
    if (regUser.length < 3) {
      notify("El nombre de usuario debe tener al menos 3 caracteres.", "error");
      console.error("El nombre de usuario debe tener al menos 3 caracteres.");
      setLoading(false);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) {
      notify("Correo electrónico inválido.", "error");
      console.error("Correo electrónico inválido.");
      setLoading(false);
      return;
    }
    if (regPassword !== regConfirmPassword) {
      notify("Las contraseñas no coinciden.", "error");
      console.error("Las contraseñas no coinciden.");
      setLoading(false);
      return;
    }
    if (regPassword.length < 6) {
      notify("La contraseña debe tener al menos 6 caracteres.", "error");
      console.error("La contraseña debe tener al menos 6 caracteres.");
      setLoading(false);
      return;
    }
    apiJson("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        username: regUser,
        email: regEmail,
        password: regPassword,
      }),
    })
      .then((data) => {
        console.log("Registro exitoso:", data);
        handleSuccessfulIdentification(data);
        setIsRegisterFormVisible(false);
      })
      .catch((error) => {
        console.error("Error en el registro:", error.message);
        notify(error.message, "error");
      })
      .finally(() => {
        setLoading(false);
      });
  };
  if (loading) {
    return <div className="loading"></div>;
  }
  return (
    <div className="identifier-page">
      <header>
        <h1>Chop/URL</h1>
      </header>
      <main>
        <NavLink className="back-button" to="/">
          <svg
            className="back-button__icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path d="M9 14l-4 -4l4 -4" />
            <path d="M5 10h11a4 4 0 1 1 0 8h-1" />
          </svg>
        </NavLink>
        <form
          noValidate
          className={`login-form ${isRegisterFormVisible ? "is-hidden" : ""}`}
          id="loginForm"
          onSubmit={handleLoginSubmit}
        >
          <input
            type="email"
            placeholder="Correo Electrónico"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            required
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="login-button">
            Iniciar Sesión
          </button>
          <footer>
            <p>
              ¿No tienes una cuenta?{" "}
              <a
                href="#"
                id="registerLink"
                onClick={(event) => {
                  event.preventDefault();
                  setIsRegisterFormVisible(true);
                }}
              >
                Regístrate
              </a>
            </p>
          </footer>
        </form>
        <form
          noValidate
          className={`register-form ${isRegisterFormVisible ? "" : "is-hidden"}`}
          id="registerForm"
          onSubmit={handleRegisterSubmit}
        >
          <input
            type="text"
            placeholder="Usuario"
            value={regUser}
            required
            onChange={(e) => setRegUser(e.target.value)}
          />
          <input
            type="email"
            placeholder="Correo Electrónico"
            value={regEmail}
            required
            onChange={(e) => setRegEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={regPassword}
            required
            onChange={(e) => setRegPassword(e.target.value)}
          />
          <input
            type="password"
            placeholder="Confirmar Contraseña"
            value={regConfirmPassword}
            required
            onChange={(e) => setRegConfirmPassword(e.target.value)}
          />
          <button type="submit">Registrarse</button>
          <footer>
            <p>
              ¿Ya tienes una cuenta?
              <a
                href="#"
                id="loginLink"
                onClick={(event) => {
                  event.preventDefault();
                  setIsRegisterFormVisible(false);
                }}
              >
                Iniciar Sesión
              </a>
            </p>
          </footer>
        </form>
      </main>
    </div>
  );
}

export default Identify;
