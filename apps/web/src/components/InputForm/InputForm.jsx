import "./InputForm.css";
import { forwardRef, useImperativeHandle, useRef } from "react";
import { useAuthStore } from "../../store/authStore.js";
import { useNotificationStore } from "../../store/notificationStore.js";
import { apiJson } from "../../config/api.js";
const InputForm = forwardRef(
  (
    {
      svgPath,
      icon,
      placeholder,
      buttonContent = "",
      name = "",
      type = "text",
      value,
      ariaLabel,
      onSubmit,
      onChange = () => {},
      disabled = false,
      extraData = {},
      onSuccess,
      onError,
      children,
    },
    ref,
  ) => {
    const notify = useNotificationStore((s) => s.notify);
    const { user } = useAuthStore();
    const formRef = useRef(null);

    useImperativeHandle(ref, () => ({
      submit: () => {
        if (formRef.current) {
          formRef.current.requestSubmit();
        }
      },
    }));

    const handleSubmit = (event) => {
      event.preventDefault();
      if (disabled) return;

      const payload = {
        titulo: extraData?.titulo || "Sin título",
        urlOriginal: value,
        slug: extraData?.slug || Math.random().toString(36).substring(2, 8),
        userId: user?.id,
      };

      // Si el padre paso su propio onSubmit (por ejemplo Links.jsx para busquedas), ejecutarlo
      if (typeof onSubmit === "function") {
        onSubmit(event, payload);
        return;
      }

      // Si se especifico un endpoint (o por defecto para crear enlaces):
      if (user === null) {
        notify("Debes iniciar sesión para acortar enlaces", "error");
        return;
      }
      apiJson("/links", {
        method: "POST",
        body: JSON.stringify(payload),
      })
        .then((data) => {
          notify("Enlace acortado con éxito", "success");
          if (typeof onSuccess === "function") onSuccess(data);
        })
        .catch((err) => {
          notify("Error al acortar el enlace", "error");
          console.error("Error al realizar fetch en InputForm:", err);
          if (typeof onError === "function") onError(err);
        });
    };
    return (
      <form className="input-form" onSubmit={handleSubmit} ref={formRef}>
        {icon ? (
          icon
        ) : svgPath ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#607d8b"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={svgPath} />
          </svg>
        ) : null}
        <input
          type={type}
          aria-label={ariaLabel || placeholder}
          placeholder={placeholder}
          name={name}
          value={value}
          onChange={onChange}
        />
        {type === "text" && (
          <button
            className={`input-form-button ${disabled ? "disabled" : ""}`}
            disabled={disabled}
            type="submit"
          >
            {buttonContent}
          </button>
        )}
        {children}
      </form>
    );
  },
);

export default InputForm;
