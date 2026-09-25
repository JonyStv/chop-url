// Analytics.jsx - Versión corregida
import "./Analytics.css";
import StatCard from "../../components/StatCard/StatCard.jsx";
import GraphicCard from "../../components/GraphicCard/GraphicCard.jsx";
import ChartCard from "../../components/ChartCard/ChartCard.jsx";
import Table from "../../components/Table/Table.jsx";
import Calendar, {
  formatDisplayDate,
} from "../../components/Calendar/Calendar.jsx";
import { useState, useEffect } from "react";
import { useAuthStore } from "../../store/authStore.js";
import { apiJson } from "../../config/api.js";

function Analytics() {
  const { user } = useAuthStore();
  const userId = user?.id;
  const [loading, setLoading] = useState(false);
  const [selecterLinkOpen, setSelecterLinkOpen] = useState(false);
  const [selectedLinkId, setSelectedLinkId] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [timeframe, setTimeframe] = useState({
    startDate: null,
    endDate: null,
  });

  const [summary, setSummary] = useState({
    totalClicks: 0,
    uniqueVisitors: 0,
    primaryCountry: "N/A",
    averageCTR: 0,
    countries: null,
    devices: null,
    referrers: null,
    comparison: {
      totalClicks: 0,
      uniqueVisitors: 0,
      primaryCountryClicks: 0,
      averageCTR: 0,
    },
  });
  const [links, setLinks] = useState([]);

  useEffect(() => {
    if (!userId) return;

    apiJson(`/links/${userId}`)
      .then((json) => {
        setLinks(json);
      })
      .catch((err) => {
        console.error("Error al obtener enlaces:", err);
      });
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (timeframe.startDate) params.set("startDate", timeframe.startDate);
    if (timeframe.endDate) params.set("endDate", timeframe.endDate);

    const query = params.toString();
    if (!userId) return;

    apiJson(
      `/analytics/${userId}/summary/${selectedLinkId || "all"}${query ? `?${query}` : ""}`,
    )
      .then((json) => {
        setSummary(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error al obtener resumen:", err);
        setLoading(false);
      });
  }, [userId, selectedLinkId, timeframe]);

  const handleSelecterLinkToggle = () => {
    setSelecterLinkOpen(!selecterLinkOpen);
  };

  const handleSelectLink = (enlaceId) => {
    setSelectedLinkId((prev) => (prev === enlaceId ? null : enlaceId));
  };
  return (
    <div className="analytics-page">
      <section className="analytics-header-section">
        <div className="analytics-text">
          <h1>Analíticas</h1>
          <p>
            Bienvenido a la sección de analíticas. Aquí podrás ver un resumen de
            las estadísticas de tu aplicación.
          </p>
        </div>
        <div className="button-group-analytics">
          <p className="link-selected-name">
            {selectedLinkId !== null
              ? "/" + links.find((e) => e.id === selectedLinkId)?.slug
              : "Datos Globales"}
          </p>
          <button
            className="choose-link-button"
            onClick={handleSelecterLinkToggle}
            aria-expanded={selecterLinkOpen}
            aria-controls="analytics-link-selector"
          >
            Elegir Enlace
          </button>
          <button
            className={`choose-timeframe-button ${timeframe.startDate ? "active" : ""}`}
            onClick={() => setCalendarOpen(true)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            {timeframe.startDate && timeframe.endDate
              ? `${formatDisplayDate(timeframe.startDate)} — ${formatDisplayDate(timeframe.endDate)}`
              : timeframe.startDate
                ? `${formatDisplayDate(timeframe.startDate)} — Hoy`
                : "Elegir Intervalo de Tiempo"}
          </button>
        </div>
      </section>

      <section className="stat-cards-container">
        <StatCard
          title="Total de Clicks"
          value={summary.totalClicks}
          comparisonValue={summary.comparison.totalClicks}
        />
        <StatCard
          title="Visitantes Únicos"
          value={summary.uniqueVisitors}
          comparisonValue={summary.comparison.uniqueVisitors}
        />
        <StatCard
          title="País Principal"
          value={summary.primaryCountry}
          comparisonValue={summary.comparison.primaryCountryClicks}
        />
        <StatCard
          title="CTR Promedio"
          value={summary.averageCTR}
          comparisonValue={summary.comparison.averageCTR}
        />
      </section>

      <section className="graphic-cards-container">
        <GraphicCard
          title="Distribución Global"
          description="Muestra la distribución de visitantes por país."
          data={summary.countries}
        />
        <GraphicCard
          title="Dispositivos"
          description="Muestra la distribución de visitantes por tipo de dispositivo."
          data={summary.devices}
        />
        <GraphicCard
          title="Fuentes de Tráfico"
          description="Muestra la distribución de visitantes por fuente de tráfico."
          data={summary.referrers}
        />
      </section>
      <section className="url-performance-section">
        <p className="link-selected-name">
          {selectedLinkId !== null
            ? "Link:" + "/" + links.find((e) => e.id === selectedLinkId)?.slug
            : "Datos Globales"}
        </p>
        <ChartCard
          title="Rendimiento de Enlaces"
          description="Muestra el rendimiento de tus enlaces a lo largo del tiempo."
          data={summary.clicksOverTime}
        />
      </section>
      {selecterLinkOpen && (
        <section
          id="analytics-link-selector"
          className="analytics-table-overlay"
          onClick={handleSelecterLinkToggle}
        >
          <div
            className="analytics-table-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="analytics-table-modal-header">
              <h2>Elegir Enlace</h2>
              <button
                type="button"
                className="analytics-table-close-button"
                onClick={handleSelecterLinkToggle}
              >
                Cerrar
              </button>
            </div>
            <div className="analytics-table-container">
              <Table
                data={links}
                mode="select"
                selectedLinkId={selectedLinkId}
                onSelectLink={handleSelectLink}
              />
            </div>
          </div>
        </section>
      )}

      {calendarOpen && (
        <Calendar
          isOpen={calendarOpen}
          onClose={() => setCalendarOpen(false)}
          onApply={({ startDate, endDate }) => {
            setTimeframe({ startDate, endDate });
          }}
          initialStartDate={timeframe.startDate}
          initialEndDate={timeframe.endDate}
        />
      )}
    </div>
  );
}

export default Analytics;
