// components/Notification.jsx
import { useEffect } from "react";
import "./Notification.css";

export default function Notification({
  message,
  type = "info",
  onClose,
  timer = 3000,
}) {
  useEffect(() => {
    if (!timer) return;
    const id = setTimeout(onClose, timer);
    return () => clearTimeout(id);
  }, [timer, onClose]);

  return (
    <div className={`notification notification--${type}`} role="alert">
      <span>{message}</span>
      <button onClick={onClose} aria-label="Cerrar">
        ×
      </button>
    </div>
  );
}
