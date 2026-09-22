// TableRow.jsx
import React from "react";

export function NoNamed({ enlace, mode }) {
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
  return (
    <>
      <td className="link-column">
        {mode === "select" ? (
          <span>{urlAcortada}</span>
        ) : (
          <a href={urlAcortada} target="_blank" rel="noopener noreferrer">
            {urlAcortada}
          </a>
        )}
      </td>
      <td className="link-column">
        {mode === "select" ? (
          <span>{enlace.url_original}</span>
        ) : (
          <a
            href={enlace.url_original}
            target="_blank"
            rel="noopener noreferrer"
          >
            {enlace.url_original}
          </a>
        )}
      </td>
      <td className="properties-column">{fechaCreacion}</td>
      <td className="properties-column">{enlace.total_clicks || 0}</td>
      <td className="status">
        <p className={`${enlace.estado === "Activo" ? "active" : "inactive"}`}>
          {enlace.estado}
        </p>
      </td>
    </>
  );
}
function TableRow({
  enlace,
  mode,
  shouldRenderCheckboxes,
  isSelected,
  onToggle,
  selectedLinkId,
  handleSelectLink,
}) {
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
        <NoNamed enlace={enlace} mode={mode} />
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
      <NoNamed enlace={enlace} mode={mode} />
    </tr>
  );
}

export default React.memo(TableRow);
