import "./EditCard.css";
import { useEditStore } from "../../store/editStore.js";
import { useState, useEffect } from "react";
import { apiJson } from "../../config/api.js";

function EditCard() {
  const { isOpen, currentLink, closeEditModal } = useEditStore();

  // 1. Inicializamos el estado siempre con strings vacíos para evitar inputs "no controlados"
  const [updatedLink, setUpdatedLink] = useState({
    titulo: "",
    url_original: "",
    slug: "",
  });
  const [placeholderLink, setPlaceholderLink] = useState({
    titulo: "",
    url_original: "",
    slug: "",
  });
  const [loading, setLoading] = useState(false);

  // 2. Cargamos los datos reales del enlace cuando se abre el modal
  useEffect(() => {
    if (isOpen && currentLink) {
      setUpdatedLink({
        titulo: "",
        url_original: "",
        slug: "",
      });
      setPlaceholderLink({
        titulo: currentLink.titulo || "",
        url_original: currentLink.url_original || "",
        slug: currentLink.slug || "",
      });
    }
  }, [isOpen, currentLink]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiJson(`/links/${currentLink.id}`, {
        method: "PUT",
        body: JSON.stringify({
          titulo: updatedLink.titulo,
          urlOriginal: updatedLink.url_original,
          slug: updatedLink.slug,
          estado: currentLink.estado, // Mantenemos el estado original
        }),
      });
      closeEditModal(); // Cerramos el modal al terminar con éxito
    } catch (error) {
      console.error("Error al actualizar el enlace:", error);
    } finally {
      setLoading(false);
    }
  };

  // 3. Prevenimos el error "Invalid Date" si currentLink.fecha_creacion es null/undefined
  const fechaCreacion = currentLink?.fecha_creacion
    ? new Date(currentLink.fecha_creacion).toLocaleDateString()
    : "Sin fecha";

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
                placeholder={placeholderLink.titulo}
                onChange={(e) =>
                  setUpdatedLink({ ...updatedLink, titulo: e.target.value })
                }
              />
            </label>
            <label>
              URL Original:
              <input
                type="text"
                value={updatedLink.url_original}
                placeholder={placeholderLink.url_original}
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
                value={updatedLink.slug}
                placeholder={placeholderLink.slug}
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
