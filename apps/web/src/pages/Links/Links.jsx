// Links.jsx - Versión mejorada con el hook
import "./Links.css";
import Table from "../../components/Table/Table";
import InputForm from "../../components/InputForm/InputForm";
import useLinkFilters from "../../hooks/useLinkFilters"; // ← Nuevo hook
import { useState } from "react";
import { useAuthStore } from "../../store/authStore.js";
import EditCard from "../../components/EditCard/EditCard.jsx";
import { NavLink } from "react-router-dom";

function Links({}) {
  const { user, accessToken } = useAuthStore(); // Obtener el usuario autenticado
  // 1. Usar el hook de filtros (toda la lógica de filtrado la hace el backend)
  const {
    userId,
    statusFilter,
    searchTerm,
    setStatusFilter,
    setSearchTerm,
    filteredEnlaces,
    totalResults,
    hasActiveFilters,
    clearFilters,
    removeEnlaces,
    filterStats,
  } = useLinkFilters({
    userId: user?.id,
    initialFilter: "all",
    initialSearch: "",
    debounceDelay: 300,
  });

  // 2. Handlers
  const handleStatusChange = (event) => {
    setStatusFilter(event.target.value);
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const text = formData.get("search");
    setSearchTerm(text);
  };

  const handleTextChange = (event) => {
    setSearchTerm(event.target.value);
  };

  return (
    <div className="links-page">
      <section className="enlaces-header-section">
        <div className="enlaces-text">
          <h1>Gestión de Enlaces</h1>
          <p>Visualiza, filtra y administra todos tus enlaces acortados.</p>
        </div>
        <div className="enlaces-buttons">
          <button type="button" className="export-button">
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
              <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" />
              <path d="M7 11l5 5l5 -5" />
              <path d="M12 4l0 12" />
            </svg>
            Exportar Datos
          </button>
          <NavLink to="/" className="add-button">
            <button type="button" className="add-button">
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
                <path d="M9 15l6 -6" />
                <path d="M11 6l.463 -.536a5 5 0 0 1 7.072 0a4.993 4.993 0 0 1 -.001 7.072" />
                <path d="M12.603 18.534a5.07 5.07 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463" />
                <path d="M16 19h6" />
                <path d="M19 16v6" />
              </svg>
              Nuevo Enlace
            </button>
          </NavLink>
        </div>
      </section>

      <section className="input-section">
        <select
          name="filter"
          id="filterSelect"
          value={statusFilter}
          onChange={handleStatusChange}
        >
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>

        <InputForm
          svgPath="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0 M21 21l-6 -6"
          type="search"
          placeholder="Busca tu enlace acortado o original aquí"
          name="search"
          value={searchTerm}
          onSubmit={handleSubmit}
          onChange={handleTextChange}
        />
      </section>

      <section className="table-section">
        <Table
          key={`${statusFilter}-${searchTerm}`}
          data={filteredEnlaces}
          mode="manage"
          accessToken={accessToken}
          onDeleteSuccess={removeEnlaces}
        />
      </section>
      <section className="edit-card-section">
        <EditCard />
      </section>
    </div>
  );
}

export default Links;
