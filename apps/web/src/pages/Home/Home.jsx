import StatCard from "../../components/StatCard/StatCard";
import InputForm from "../../components/InputForm/InputForm";
import "./Home.css";
import { useEffect, useState, useRef } from "react";
import { useAuthStore } from "../../store/authStore.js";
import { apiJson } from "../../config/api.js";

const URL_REGEX =
  /^(https?:\/\/)?(([\w-]+\.)+[\w-]+)(:[0-9]{1,5})?(\/[\w\-._~:/?#[\]@!$&'()*+,;=%]*)?$/;

function Home({}) {
  const { user, accessToken } = useAuthStore();
  const [summary, setSummary] = useState({
    totalClicks: 0,
    uniqueVisitors: 0,
    primaryCountry: "N/A",
    averageCTR: 0,
  });
  const [loading, setLoading] = useState(false);

  // Validación de URL
  const [url, setUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [titulo, setTitulo] = useState("");
  const [isValidUrl, setIsValidUrl] = useState(false);
  const [isOptionalInputsVisible, setIsOptionalInputsVisible] = useState(false);

  const inputFormRef = useRef(null);

  const resetForm = () => {
    setUrl("");
    setSlug("");
    setTitulo("");
    setIsValidUrl(false);
  };
  const handleUrlChange = (event) => {
    const value = event.target.value;
    setUrl(value);
    setIsValidUrl(URL_REGEX.test(value));
  };
  const handleOptionalKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (inputFormRef.current) {
        inputFormRef.current.submit();
      }
    }
  };
  useEffect(() => {
    setLoading(true);
    if (!user?.id) return;

    apiJson(`/analytics/${user.id}/summary`)
      .then((json) => {
        setSummary(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error al obtener resumen:", err);
        setLoading(false);
      });
  }, [user?.id]);
  return (
    <div className="home-page">
      <section className="url-shortener-section">
        <h1>Acorta tu URL</h1>
        <p>
          Pega una URL larga a continuación para crear instantáneamente un
          enlace corto, seguro y rastreable optimizado para campañas de alto
          rendimiento.
        </p>
        <InputForm
          ref={inputFormRef}
          svgPath="M9 15l6 -6 M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464 M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463"
          type="text"
          placeholder="Pega tu URL aquí"
          buttonContent="Acortar URL"
          value={url}
          onChange={handleUrlChange}
          disabled={!isValidUrl}
          extraData={{ slug, titulo }}
          onSuccess={(data) => {
            console.log("Enlace creado exitosamente:", data);
            resetForm();
          }}
        />
        <svg
          className={`svg-toggle ${isOptionalInputsVisible ? "active" : ""}`}
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#607d8b"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          onClick={() => setIsOptionalInputsVisible(!isOptionalInputsVisible)}
        >
          <path d="M6 9l6 6l6 -6" />
        </svg>
        <div
          className={`optional-inputs ${!isOptionalInputsVisible ? "hidden" : ""}`}
        >
          <input
            type="text"
            placeholder="Pega tu slug aquí (opcional)"
            className="slug-input"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            onKeyDown={handleOptionalKeyDown}
          />
          <input
            type="text"
            placeholder="Pega tu título aquí (opcional)"
            className="title-input"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onKeyDown={handleOptionalKeyDown}
          />
        </div>
      </section>

      <section className="stats-section">
        <StatCard
          title="Clicks Totales"
          value={summary.totalClicks}
          svgPath="M3 12l3 0M12 3l0 3M7.8 7.8l-2.2 -2.2M16.2 7.8l2.2 -2.2M7.8 16.2l-2.2 2.2M12 12l9 3l-4 2l-2 4l-3 -9"
        />
        <StatCard
          title="Visitantes Unicos"
          value={summary.uniqueVisitors}
          svgPath="M12 2a5 5 0 1 1 -5 5l.005 -.217a5 5 0 0 1 4.995 -4.783z M14 14a5 5 0 0 1 5 5v1a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-1a5 5 0 0 1 5 -5h4z"
        />
        <StatCard
          title="Pais Principal"
          value={summary.primaryCountry}
          svgPath="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0 M3.6 9h16.8 M3.6 15h16.8 M11.5 3a17 17 0 0 0 0 18 M12.5 3a17 17 0 0 1 0 18"
        />
        <StatCard
          title="CTR Promedio"
          value={summary.averageCTR}
          svgPath="M8 13v-8.5a1.5 1.5 0 0 1 3 0v7.5 M11 11.5v-2a1.5 1.5 0 0 1 3 0v2.5 M14 10.5a1.5 1.5 0 0 1 3 0v1.5 M17 11.5a1.5 1.5 0 0 1 3 0v4.5a6 6 0 0 1 -6 6h-2h.208a6 6 0 0 1 -5.012 -2.7l-.196 -.3c-.312 -.479 -1.407 -2.388 -3.286 -5.728a1.5 1.5 0 0 1 .536 -2.022a1.867 1.867 0 0 1 2.28 .28l1.47 1.47 M5 3l-1 -1 M4 7h-1 M14 3l1 -1 M15 6h1"
        />
      </section>

      <section className="url-performance-section">
        <h2>Rendimiento del URL en el Tiempo</h2>
        <canvas id="urlPerformanceChart" width="400" height="200"></canvas>
      </section>
    </div>
  );
}

export default Home;
