import "./EditCard.css";
import { useEditStore } from "../../store/editStore.js";
import { useState } from "react";
import { apiFetch, apiJson } from "../../config/api.js";
import { data } from "react-router-dom";

function EditCard() {
  const { isOpen, currentLink, closeEditModal } = useEditStore();
  const [updatedLink, setUpdatedLink] = useState(currentLink || {});
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updatedEnlace = await apiJson(`/links/${currentLink.id}`, {
        method: "PUT",
        body: JSON.stringify({
          titulo: updatedLink.titulo || currentLink.titulo,
          urlOriginal: updatedLink.url_original || currentLink.url_original,
          slug: updatedLink.slug || currentLink.slug,
          estado: currentLink.estado,
        }),
      });
      closeEditModal();
    } catch (error) {
      console.error("Error al actualizar el enlace:", error);
    } finally {
      setLoading(false);
      clearInputs();
    }
  };
  const clearInputs = () => {
    setUpdatedLink({});
  };
  const fechaCreacion = new Date(
    currentLink?.fecha_creacion,
  ).toLocaleDateString();
  return (
    <div className="edit-card-overlay">
      <div className="edit-card">
        <h2>Editar Enlace</h2>

        <form onSubmit={handleSubmit}>
          <div className="edit-card-inputs">
            <label>
              Título:
              <input
                type="text"
                value={updatedLink.titulo}
                placeholder={currentLink?.titulo || "Sin título"}
                onChange={(e) =>
                  setUpdatedLink({ ...updatedLink, titulo: e.target.value })
                }
              ></input>
            </label>
            <label>
              URL Original:
              <input
                type="text"
                placeholder={currentLink?.url_original || "Sin URL"}
                value={updatedLink.url_original}
                onChange={(e) =>
                  setUpdatedLink({
                    ...updatedLink,
                    url_original: e.target.value,
                  })
                }
              />
            </label>
            <label>
              Slug:
              <input
                type="text"
                placeholder={currentLink?.slug || "Sin slug"}
                value={updatedLink.slug}
                onChange={(e) =>
                  setUpdatedLink({ ...updatedLink, slug: e.target.value })
                }
              />
            </label>
          </div>
          <div className="edit-card-info">
            <span>Fecha de Creación: {fechaCreacion}</span>
            <span>Estado: {currentLink?.estado}</span>
          </div>
          <div className="edit-card-actions">
            <button type="submit" disabled={loading}>
              {loading ? "Actualizando..." : "Actualizar"}
            </button>
            <button type="button" onClick={closeEditModal}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditCard;
