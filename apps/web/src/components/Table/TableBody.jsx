// TableBody.jsx
import React from "react";
import TableRow from "./TableRow";

export default function TableBody({
  pagedLinks,
  mode,
  shouldRenderCheckboxes,
  selectedEnlaces,
  onToggle,
  selectedLinkId,
  handleSelectLink,
}) {
  if (!pagedLinks || pagedLinks.length === 0) {
    return (
      <tbody>
        <tr>
          <td colSpan={shouldRenderCheckboxes ? 6 : 4} className="empty-state">
            No hay enlaces para mostrar
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody id="enlacesTableBody">
      {pagedLinks.map((enlace) => (
        <TableRow
          key={enlace.id}
          enlace={enlace}
          mode={mode}
          shouldRenderCheckboxes={shouldRenderCheckboxes}
          isSelected={selectedEnlaces.has(enlace.id)}
          onToggle={() => onToggle(enlace.id)}
          selectedLinkId={selectedLinkId}
          handleSelectLink={handleSelectLink}
        />
      ))}
    </tbody>
  );
}
