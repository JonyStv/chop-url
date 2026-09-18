// Table.jsx
import "./Table.css";
import TableBody from "./TableBody.jsx";
import useSelection from "../../hooks/useSelection.js";
import usePagination from "../../hooks/usePagination.js";
import { useNotificationStore } from "../../store/notificationStore.js";
import { apiFetch } from "../../config/api.js";

const MAX_LINKS_PER_PAGE = 8;

function Table({
  data,
  mode = "manage",
  selectedLinkId,
  onSelectLink,
  handleSelectLink, // Soporte para retrocompatibilidad
  onDeleteSuccess,
  accessToken,
}) {
  const notify = useNotificationStore((s) => s.notify);

  const isSelectMode = mode === "select";
  const shouldRenderCheckboxes = !isSelectMode;
  const selectHandler = onSelectLink || handleSelectLink;

  // 1. Hook de selección
  const { selected, toggle, addMany, removeMany, clear, allChecked } =
    useSelection({
      initial: [],
      single: isSelectMode,
    });

  // 2. Hook de paginación
  const {
    currentItems,
    currentIds,
    currentPage,
    nextPage,
    prevPage,
    hasNextPage,
    hasPreviousPage,
    isEmpty,
    totalItems,
  } = usePagination(data, {
    itemsPerPage: MAX_LINKS_PER_PAGE,
  });

  // 3. Handlers de selección
  const toggleAll = (checked) => {
    if (checked) {
      addMany(currentIds);
    } else {
      removeMany(currentIds);
    }
  };

  const toggleOne = (enlaceId) => {
    toggle(enlaceId);
  };

  // 4. Handler de eliminación con llamada a la API
  const deleteSelectedItems = async () => {
    const idsToDelete = Array.from(selected);
    if (idsToDelete.length === 0) return;

    const count = idsToDelete.length;
    const confirmMessage =
      count === 1
        ? "¿Estás seguro de que deseas eliminar este enlace?"
        : `¿Estás seguro de que deseas eliminar estos ${count} enlaces?`;
    const ok = await notify.confirm(confirmMessage);
    if (!ok) return;

    try {
      await Promise.all(
        idsToDelete.map((id) =>
          apiFetch(`/links/${id}`, {
            method: "DELETE",
            headers: accessToken
              ? { Authorization: `Bearer ${accessToken}` }
              : undefined,
          }),
        ),
      );

      // Limpiar selección de checkboxes
      clear();

      // Notificar al componente padre para que actualice la lista
      if (typeof onDeleteSuccess === "function") {
        onDeleteSuccess(idsToDelete);
      }
    } catch (error) {
      console.error("Error al eliminar los enlaces:", error);
    }
  };

  const headerAllChecked = allChecked(currentIds);

  return (
    <table className={isSelectMode ? "table-select-mode" : ""}>
      <thead>
        <tr>
          {shouldRenderCheckboxes && (
            <th className="checkbox-column" style={{ width: "40px" }}>
              <input
                type="checkbox"
                id="select-all"
                checked={headerAllChecked}
                onChange={(event) => toggleAll(event.target.checked)}
              />
              <label htmlFor="select-all" className="checkbox-label"></label>
            </th>
          )}
          <th className="link-column">Enlace Acortado</th>
          <th className="link-column">Enlace Original</th>
          <th className="properties-column">Fecha de Creación</th>
          <th className="properties-column">Clics</th>
          <th className="properties-column">Estado</th>
        </tr>
      </thead>
      <TableBody
        pagedLinks={currentItems}
        mode={mode}
        shouldRenderCheckboxes={shouldRenderCheckboxes}
        selectedEnlaces={selected}
        onToggle={toggleOne}
        selectedLinkId={selectedLinkId}
        handleSelectLink={selectHandler}
      />
      <tfoot>
        <tr>
          {shouldRenderCheckboxes && (
            <td colSpan="1">
              <button
                type="button"
                className="delete-button"
                onClick={deleteSelectedItems}
                disabled={selected.size === 0}
                aria-label="Eliminar enlaces seleccionados"
              >
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
                  <path d="M4 7l16 0" />
                  <path d="M10 11l0 6" />
                  <path d="M14 11l0 6" />
                  <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" />
                  <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" />
                </svg>
              </button>
            </td>
          )}
          <td colSpan={shouldRenderCheckboxes ? 3 : 4}>
            <p>
              {isEmpty
                ? "No hay resultados para mostrar"
                : `Mostrando ${(currentPage - 1) * MAX_LINKS_PER_PAGE + 1} a ${Math.min(currentPage * MAX_LINKS_PER_PAGE, totalItems)} de ${totalItems} resultados`}
            </p>
          </td>
          <td colSpan="2" style={{ textAlign: "right" }}>
            <button
              type="button"
              className="nav-button"
              onClick={prevPage}
              disabled={!hasPreviousPage}
              aria-label="Página anterior"
            >
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
                <path d="M15 6l-6 6l6 6" />
              </svg>
            </button>
            <button
              type="button"
              className="nav-button"
              onClick={nextPage}
              disabled={!hasNextPage}
              aria-label="Página siguiente"
            >
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
                <path d="M9 18l6 -6l-6 -6" />
              </svg>
            </button>
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

export default Table;
