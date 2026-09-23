// TableRow.jsx
import React from "react";
import { useEditStore } from "../../store/editStore.js";

export function NoNamed({ enlace, mode }) {
  const domain = import.meta.env.VITE_APP_DOMAIN || window.location.origin;
  const { openEditModal } = useEditStore();
  const urlAcortada = `${domain.replace(/\/$/, "")}/${enlace.slug}`;
  const urlAcortadaVisible = urlAcortada.replace(/https?:\/\//g, "");
  const urlOriginal = enlace.url_original
    .replace(/https?:\/\//g, "")
    .replace(/www\./g, "");
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
      <td className="link-column shortened">
        {mode === "select" ? (
          <span>{urlAcortadaVisible}</span>
        ) : (
          <a href={urlAcortada} target="_blank" rel="noopener">
            {urlAcortadaVisible}
          </a>
        )}
      </td>
      <td className="link-column original">
        {mode === "select" ? (
          <span>{urlOriginal}</span>
        ) : (
          <a
            href={enlace.url_original}
            target="_blank"
            rel="noopener noreferrer"
          >
            {urlOriginal}
          </a>
        )}
      </td>
      <td className="properties-column">{fechaCreacion}</td>
      <td className="properties-column">{enlace.total_clicks || 0}</td>
      {mode === "manage" && (
        <td className="edit-column">
          <svg
            className="edit-icon"
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#607d8b"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            onClick={() => openEditModal(enlace)}
          >
            <path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4" />
            <path d="M13.5 6.5l4 4" />
          </svg>
        </td>
      )}
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
