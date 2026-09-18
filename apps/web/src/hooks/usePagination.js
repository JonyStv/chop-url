// hooks/usePagination.js - Versión mejorada
import { useState, useMemo, useCallback } from "react";

export default function usePagination(items, options = {}) {
  const { itemsPerPage = 8, filterFn = null } = options;

  const [currentPage, setCurrentPage] = useState(1);

  // ✅ NORMALIZAR: Extraer enlaces si es un objeto
  const normalizedItems = useMemo(() => {
    if (!items) return [];

    // Si es un array, usarlo directamente
    if (Array.isArray(items)) return items;

    // Si es un objeto con propiedad 'enlaces'
    if (items.enlaces && Array.isArray(items.enlaces)) {
      return items.enlaces;
    }

    // Si es un objeto con propiedad 'links'
    if (items.links && Array.isArray(items.links)) {
      return items.links;
    }

    // Si es un objeto con propiedad 'data'
    if (items.data && Array.isArray(items.data)) {
      return items.data;
    }

    console.warn("⚠️ usePagination: items no es un array válido:", items);
    return [];
  }, [items]);

  // ✅ Aplicar filtro
  const filteredItems = useMemo(() => {
    if (normalizedItems.length === 0) return [];

    if (filterFn && typeof filterFn === "function") {
      return normalizedItems.filter(filterFn);
    }

    return normalizedItems;
  }, [normalizedItems, filterFn]);

  // ✅ Calcular total de páginas
  const totalPages = useMemo(() => {
    if (filteredItems.length === 0) return 1;
    return Math.ceil(filteredItems.length / itemsPerPage);
  }, [filteredItems, itemsPerPage]);

  // ✅ Sincronizar página actual
  useMemo(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // ✅ Obtener items de la página actual
  const currentItems = useMemo(() => {
    if (filteredItems.length === 0) return [];

    const start = (currentPage - 1) * itemsPerPage;
    const end = Math.min(start + itemsPerPage, filteredItems.length);

    return filteredItems.slice(start, end);
  }, [filteredItems, currentPage, itemsPerPage]);

  // ✅ Extraer IDs
  const currentIds = useMemo(() => {
    return currentItems
      .map((item) => item?.id)
      .filter((id) => id !== undefined && id !== null);
  }, [currentItems]);

  // ✅ Navegación
  const goToPage = useCallback(
    (page) => {
      const target = Math.max(1, Math.min(page, totalPages));
      setCurrentPage(target);
    },
    [totalPages],
  );

  const nextPage = useCallback(
    () => goToPage(currentPage + 1),
    [currentPage, goToPage],
  );

  const prevPage = useCallback(
    () => goToPage(currentPage - 1),
    [currentPage, goToPage],
  );

  const resetPage = useCallback(() => setCurrentPage(1), []);

  // ✅ Información de paginación
  const paginationInfo = useMemo(() => {
    const total = filteredItems.length;
    if (total === 0) {
      return { start: 0, end: 0, total: 0, label: "0 resultados" };
    }
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, total);
    return {
      start,
      end,
      total,
      label: `Mostrando ${start} a ${end} de ${total} resultados`,
    };
  }, [filteredItems.length, currentPage, itemsPerPage]);

  return {
    currentPage,
    totalPages,
    filteredItems,
    currentItems,
    currentIds,
    paginationInfo,
    goToPage,
    nextPage,
    prevPage,
    resetPage,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    isEmpty: filteredItems.length === 0,
    totalItems: filteredItems.length,
  };
}
