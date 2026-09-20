// TableRow.jsx
import React from "react";

function TableRow({
  enlace,
  mode,
  shouldRenderCheckboxes,
  isSelected,
  onToggle,
  selectedLinkId,
  handleSelectLink,
}) {
  const domain = import.meta.env.VITE_APP_DOMAIN || window.location.origin;
  const urlAcortada = `${domain.replace(/\/$/, "")}/${enlace.slug}`;
  const fechaCreacion = new Date(enlace.fecha_creacion).toLocaleDateString(
    "es-ES",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  );
  // Modo select: toda la fila es un botón
  if (mode === "select") {
    const colSpan = shouldRenderCheckboxes ? 6 : 5;
    return (
      <tr
        onClick={() => handleSelectLink(enlace.id)}
        className={`selector-link-row ${selectedLinkId === enlace.id ? "selected" : ""}`}
      >
        {shouldRenderCheckboxes && (
          <td>
            <input
              type="checkbox"
              id={checkboxId}
              checked={isSelected}
              onChange={onToggle}
            />
            <label htmlFor={checkboxId} className="checkbox-label"></label>
          </td>
        )}
        <td className="link-column">{urlAcortada}</td>
        <td className="link-column">{enlace.url_original}</td>
        <td className="properties-column">{fechaCreacion}</td>
        <td className="properties-column">{enlace.totalClicks || 0}</td>
        <td className="status">
          <p
            className={`${enlace.estado === "Activo" ? "active" : "inactive"}`}
          >
            {enlace.estado}
          </p>
        </td>
      </tr>
    );
  }

  // Modo manage
  const checkboxId = `selectEnlace-${enlace.id}`;
  return (
    <tr>
      {shouldRenderCheckboxes && (
        <td className="checkbox-column">
          <input
            type="checkbox"
            id={checkboxId}
            checked={isSelected}
            onChange={onToggle}
          />
          <label htmlFor={checkboxId} className="checkbox-label"></label>
        </td>
      )}
      <td className="link-column">{urlAcortada}</td>
      <td className="link-column">{enlace.url_original}</td>
      <td className="properties-column">{fechaCreacion}</td>
      <td className="properties-column">{enlace.totalClicks || 0}</td>
      <td className="status">
        <p className={`${enlace.estado === "Activo" ? "active" : "inactive"}`}>
          {enlace.estado}
        </p>
      </td>
    </tr>
  );
}

export default React.memo(TableRow);
