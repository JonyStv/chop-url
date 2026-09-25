import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

// Registrar los módulos necesarios de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

export const ChartCard = ({
  data = [],
  titulo = "Clics a lo largo del tiempo",
}) => {
  const chartData = {
    labels: data.map((d) => d.fecha),
    datasets: [
      {
        label: "Número de Clics",
        data: data.map((d) => d.clics),
        borderColor: "#3b82f6", // Color azul (Tailwind bg-blue-500)
        backgroundColor: "rgba(59, 130, 246, 0.1)", // Fondo semitransparente
        fill: true,
        tension: 0.3, // Curvatura suave de la línea
        pointRadius: 4,
        pointBackgroundColor: "#1d4ed8",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Ocultar leyenda si solo hay 1 línea
      },
      title: {
        display: true,
        text: titulo,
        font: {
          size: 16,
        },
      },
      tooltip: {
        mode: "index",
        intersect: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1, // Asegurar que solo muestre enteros
        },
      },
    },
  };

  return (
    <div style={{ height: "350px", width: "100%" }}>
      <Line data={chartData} options={options} />
    </div>
  );
};
export default ChartCard;
