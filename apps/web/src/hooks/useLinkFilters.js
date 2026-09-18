// hooks/useLinkFilters.js - Filtrado delegado al backend
import { useState, useMemo, useCallback, useEffect } from "react";
import { apiJson } from "../config/api.js";

export default function useLinkFilters(options = {}) {
  const {
    userId,
    initialFilter = "all",
    initialSearch = "",
    debounceDelay = 300,
  } = options;

  // Estado de los filtros
  const [statusFilter, setStatusFilter] = useState(initialFilter);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initialSearch);
  const [filteredEnlaces, setFilteredEnlaces] = useState([]);

  // Debounce para búsqueda
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, debounceDelay);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, debounceDelay]);

  // Petición a la API con ambos filtros (estado + búsqueda)
  useEffect(() => {
    const params = new URLSearchParams();

    if (statusFilter !== "all") {
      const estado = statusFilter === "active" ? "Activo" : "Inactivo";
      params.set("estado", estado);
    }

    if (debouncedSearchTerm.trim()) {
      params.set("search", debouncedSearchTerm.trim());
    }

    const query = params.toString();
    if (!userId) return;

    apiJson(`/links/${userId}${query ? `?${query}` : ""}`)
      .then((json) => setFilteredEnlaces(json))
      .catch((err) => console.error("Error al obtener enlaces:", err));
  }, [statusFilter, debouncedSearchTerm]);
  // Estadísticas detalladas de filtros
  const filterStats = useMemo(() => {
    const activeFilters = [];

    if (statusFilter !== "all") {
      activeFilters.push({
        type: "status",
        label: `Estado: ${statusFilter}`,
        value: statusFilter,
      });
    }

    if (debouncedSearchTerm.trim()) {
      activeFilters.push({
        type: "search",
        label: `Búsqueda: "${debouncedSearchTerm}"`,
        value: debouncedSearchTerm,
      });
    }

    return {
      count: activeFilters.length,
      activeFilters,
      hasFilters: activeFilters.length > 0,
      summary: activeFilters.map((f) => f.label).join(", "),
    };
  }, [statusFilter, debouncedSearchTerm]);

  // Resumen simple
  const filterSummary = useMemo(
    () => ({
      count: filterStats.count,
      label: filterStats.hasFilters
        ? `Filtros activos: ${filterStats.summary}`
        : "Sin filtros",
    }),
    [filterStats],
  );

  // Eliminar enlaces del estado local tras borrar en la API
  const removeEnlaces = useCallback((deletedIds) => {
    setFilteredEnlaces((prev) =>
      prev.filter((enlace) => !deletedIds.includes(enlace.id)),
    );
  }, []);

  return {
    // Estado de filtros
    statusFilter,
    searchTerm,
    debouncedSearchTerm,

    // Resultados filtrados
    filteredEnlaces,
    totalResults: filteredEnlaces.length,

    // Estadísticas
    filterStats,
    filterSummary,

    // Setters
    setStatusFilter,
    setSearchTerm,
    removeEnlaces,

    // Helpers para UI
    hasActiveFilters: filterStats.hasFilters,

    // Getters para componentes
    getFilteredData: () => ({
      ...(Array.isArray(filteredEnlaces) ? { enlaces: filteredEnlaces } : {}),
    }),
  };
}
