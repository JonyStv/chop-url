// components/GraphicCard.jsx
import "./GraphicCard.css";
import React, { useRef, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  BarController,
} from "chart.js";
import { Bar } from "react-chartjs-2";

// Registrar los componentes necesarios
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  BarController,
);

const GraphicCard = ({
  title,
  description,
  data,
  colors = ["#4F46E5", "#7C3AED", "#EC4899", "#F59E0B", "#10B981"],
  height = 360,
  showPercentage = true,
  horizontal = true,
  className = "",
}) => {
  const chartRef = useRef(null);

  // Configuración por defecto para gráficos de porcentaje
  const defaultData = {
    labels: [],
    datasets: [
      {
        label: "Porcentaje",
        backgroundColor: colors.slice(0, 5),
        borderColor: colors.slice(0, 5).map((color) => color),
        borderWidth: 1,
        borderRadius: 6,
        barPercentage: 0.85,
        categoryPercentage: 0.85,
        maxBarThickness: 42,
      },
    ],
  };

  const chartData = React.useMemo(() => {
    if (!data || !data.labels || data.labels.length === 0) {
      return defaultData;
    }

    const numLabels = data.labels.length;
    const barColors = colors.slice(0, numLabels);

    // Si data ya viene con datasets
    if (data.datasets && Array.isArray(data.datasets)) {
      return {
        labels: data.labels,
        datasets: data.datasets.map((ds) => ({
          backgroundColor: ds.backgroundColor || barColors,
          borderColor: ds.borderColor || barColors,
          borderWidth: 1,
          borderRadius: 6,
          barPercentage: 0.85,
          categoryPercentage: 0.85,
          maxBarThickness: 42,
          ...ds,
        })),
      };
    }

    // Si data viene en formato simplificado { labels, data }
    if (Array.isArray(data.data)) {
      return {
        labels: data.labels,
        datasets: [
          {
            label: "Porcentaje",
            data: data.data,
            backgroundColor: barColors,
            borderColor: barColors,
            borderWidth: 1,
            borderRadius: 6,
            barPercentage: 0.85,
            categoryPercentage: 0.85,
            maxBarThickness: 42,
          },
        ],
      };
    }

    return defaultData;
  }, [data, colors]);

  // Opciones para gráfico horizontal
  const options = {
    indexAxis: horizontal ? "y" : "x",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed.x !== undefined) {
              label += context.parsed.x + "%";
            }
            return label;
          },
        },
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        max: 100,
        grid: {
          display: true,
          color: "rgba(0,0,0,0.05)",
        },
        ticks: {
          callback: function (value) {
            return value + "%";
          },
          font: {
            size: 11,
          },
        },
      },
      y: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 13,
            weight: "600",
          },
          padding: 6,
        },
      },
    },
    layout: {
      padding: {
        left: 0,
        right: 35,
        top: 4,
        bottom: 4,
      },
    },
    animation: {
      duration: 1000,
      easing: "easeInOutQuart",
    },
  };

  // Plugin personalizado para mostrar porcentajes en las barras
  const percentagePlugin = {
    id: "percentagePlugin",
    afterDraw: function (chart) {
      if (!showPercentage) return;

      const {
        ctx,
        data,
        chartArea: { top, bottom, left, right },
      } = chart;

      chart.data.datasets.forEach(function (dataset, i) {
        const meta = chart.getDatasetMeta(i);
        meta.data.forEach(function (bar, index) {
          const dataValue = dataset.data[index];

          if (dataValue > 0) {
            const x = bar.x + (horizontal ? 0 : bar.width / 2);
            const y = bar.y + (horizontal ? bar.height / 2 : 0);

            ctx.save();
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#1F2937";
            ctx.font = "12px Inter, system-ui, sans-serif";
            ctx.fillText(dataValue + "%", x + 70, y);
            ctx.restore();
          }
        });
      });
    },
  };

  // Registrar el plugin personalizado
  useEffect(() => {
    if (chartRef.current) {
      ChartJS.register(percentagePlugin);
    }

    return () => {
      ChartJS.unregister(percentagePlugin);
    };
  }, []);

  return (
    <article className={`graphic-card ${className}`}>
      <div className="graphic-card-header">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="graphic-card-content">
        <div style={{ height: `${height}px`, width: "100%" }}>
          <Bar ref={chartRef} data={chartData} options={options} />
        </div>
      </div>
    </article>
  );
};

export default GraphicCard;
