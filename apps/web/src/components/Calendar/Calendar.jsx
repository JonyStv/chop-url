// components/Calendar/Calendar.jsx
import "./Calendar.css";
import React, { useState, useMemo } from "react";

const pad = (n) => String(n).padStart(2, "0");

export const formatDateYYYYMMDD = (date) => {
  if (!date) return "";
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const formatDisplayDate = (dateStr) => {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
};

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

export default function Calendar({
  isOpen = true,
  onClose = () => {},
  onApply = () => {},
  initialStartDate = null,
  initialEndDate = null,
}) {
  const todayStr = useMemo(() => formatDateYYYYMMDD(new Date()), []);

  // Fecha que determina el mes que se está visualizando
  const [viewDate, setViewDate] = useState(() => {
    if (initialStartDate) {
      const [y, m] = initialStartDate.split("-");
      return new Date(parseInt(y), parseInt(m) - 1, 1);
    }
    return new Date();
  });

  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [hoverDate, setHoverDate] = useState(null);

  if (!isOpen) return null;

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const handlePrevMonth = () => {
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  // Generar cuadrícula de días para el mes visible
  const calendarDays = useMemo(() => {
    const days = [];
    const firstDayIndex = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Lunes = 0
    const totalDaysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

    // Días del mes anterior para completar la primera semana
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const prevDate = new Date(viewYear, viewMonth - 1, dayNum);
      const dateStr = formatDateYYYYMMDD(prevDate);
      days.push({
        dayNum,
        dateStr,
        isOtherMonth: true,
      });
    }

    // Días del mes actual
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const currDate = new Date(viewYear, viewMonth, i);
      const dateStr = formatDateYYYYMMDD(currDate);
      days.push({
        dayNum: i,
        dateStr,
        isOtherMonth: false,
      });
    }

    // Días del siguiente mes para completar las filas del grid (múltiplo de 7)
    const remainingDays = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingDays; i++) {
      const nextDate = new Date(viewYear, viewMonth + 1, i);
      const dateStr = formatDateYYYYMMDD(nextDate);
      days.push({
        dayNum: i,
        dateStr,
        isOtherMonth: true,
      });
    }

    return days;
  }, [viewYear, viewMonth]);

  // Manejador al hacer clic en un día
  const handleDayClick = (dateStr) => {
    if (!startDate || (startDate && endDate)) {
      // Primer clic: definir fecha de inicio
      setStartDate(dateStr);
      setEndDate(null);
    } else if (startDate && !endDate) {
      // Segundo clic: definir fecha de fin o invertir si es anterior
      if (dateStr < startDate) {
        setEndDate(startDate);
        setStartDate(dateStr);
      } else if (dateStr > startDate) {
        setEndDate(dateStr);
      } else {
        // Clic en la misma fecha: se queda como única fecha seleccionada
        setEndDate(null);
      }
    }
  };

  // Presets rápidos
  const handlePreset = (presetType) => {
    const now = new Date();
    const nowStr = formatDateYYYYMMDD(now);

    if (presetType === "today") {
      setStartDate(nowStr);
      setEndDate(nowStr);
      setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
    } else if (presetType === "last7") {
      const past = new Date();
      past.setDate(now.getDate() - 7);
      const pastStr = formatDateYYYYMMDD(past);
      setStartDate(pastStr);
      setEndDate(nowStr);
      setViewDate(new Date(past.getFullYear(), past.getMonth(), 1));
    } else if (presetType === "last30") {
      const past = new Date();
      past.setDate(now.getDate() - 30);
      const pastStr = formatDateYYYYMMDD(past);
      setStartDate(pastStr);
      setEndDate(nowStr);
      setViewDate(new Date(past.getFullYear(), past.getMonth(), 1));
    } else if (presetType === "thisMonth") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(formatDateYYYYMMDD(startOfMonth));
      setEndDate(nowStr);
      setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
    } else if (presetType === "all") {
      setStartDate(null);
      setEndDate(null);
    }
  };

  // Confirmar y aplicar selección
  const handleApply = () => {
    let finalStart = startDate;
    let finalEnd = endDate;

    // Regla solicitada: si solo se escoge una fecha, el intervalo es desde esa fecha hasta el día de hoy
    if (finalStart && !finalEnd) {
      if (finalStart <= todayStr) {
        finalEnd = todayStr;
      } else {
        finalEnd = finalStart;
        finalStart = todayStr;
      }
    }

    onApply({
      startDate: finalStart,
      endDate: finalEnd,
    });
    onClose();
  };

  // Restablecer / Quitar filtro de fecha
  const handleClear = () => {
    setStartDate(null);
    setEndDate(null);
    onApply({
      startDate: null,
      endDate: null,
    });
    onClose();
  };

  return (
    <div className="calendar-overlay" onClick={onClose}>
      <div className="calendar-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="calendar-header">
          <h2>Seleccionar Intervalo de Tiempo</h2>
          <button
            type="button"
            className="calendar-close-button"
            onClick={onClose}
            aria-label="Cerrar calendario"
          >
            ✕
          </button>
        </div>

        <div className="calendar-body">
          {/* Presets rápidos */}
          <div className="calendar-presets">
            <button
              type="button"
              className="calendar-preset-btn"
              onClick={() => handlePreset("today")}
            >
              Hoy
            </button>
            <button
              type="button"
              className="calendar-preset-btn"
              onClick={() => handlePreset("last7")}
            >
              Últimos 7 días
            </button>
            <button
              type="button"
              className="calendar-preset-btn"
              onClick={() => handlePreset("last30")}
            >
              Últimos 30 días
            </button>
            <button
              type="button"
              className="calendar-preset-btn"
              onClick={() => handlePreset("thisMonth")}
            >
              Este mes
            </button>
            <button
              type="button"
              className="calendar-preset-btn"
              onClick={() => handlePreset("all")}
            >
              Todo el tiempo
            </button>
          </div>

          {/* Navegación por mes */}
          <div className="calendar-month-nav">
            <button
              type="button"
              className="calendar-nav-btn"
              onClick={handlePrevMonth}
              aria-label="Mes anterior"
            >
              ◀
            </button>
            <span className="calendar-month-label">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              className="calendar-nav-btn"
              onClick={handleNextMonth}
              aria-label="Mes siguiente"
            >
              ▶
            </button>
          </div>

          {/* Días de la semana */}
          <div className="calendar-grid">
            {WEEKDAYS.map((w) => (
              <div key={w} className="calendar-weekday">
                {w}
              </div>
            ))}

            {/* Celdas de días */}
            {calendarDays.map(({ dayNum, dateStr, isOtherMonth }) => {
              const isStart = startDate === dateStr;
              const isEnd = endDate === dateStr;
              const isSingleSelected = startDate === dateStr && !endDate;

              let inRange = false;
              if (startDate && endDate) {
                inRange = dateStr > startDate && dateStr < endDate;
              }

              let inHover = false;
              if (startDate && !endDate && hoverDate) {
                if (hoverDate > startDate) {
                  inHover = dateStr > startDate && dateStr <= hoverDate;
                } else if (hoverDate < startDate) {
                  inHover = dateStr < startDate && dateStr >= hoverDate;
                }
              }

              const isToday = dateStr === todayStr;

              return (
                <button
                  key={dateStr}
                  type="button"
                  className={`calendar-day-cell ${isOtherMonth ? "other-month" : ""} ${
                    isToday ? "today" : ""
                  } ${isStart ? "range-start" : ""} ${isEnd ? "range-end" : ""} ${
                    isSingleSelected ? "range-start range-end" : ""
                  } ${inRange ? "in-range" : ""} ${inHover ? "hover-range" : ""}`}
                  onClick={() => handleDayClick(dateStr)}
                  onMouseEnter={() => setHoverDate(dateStr)}
                  onMouseLeave={() => setHoverDate(null)}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer con resumen y acciones */}
        <div className="calendar-footer">
          <div className="calendar-selection-summary">
            <span>Intervalo:</span>
            {startDate && endDate ? (
              <strong>
                {formatDisplayDate(startDate)} — {formatDisplayDate(endDate)}
              </strong>
            ) : startDate ? (
              <strong>
                {formatDisplayDate(startDate)} — Hoy (
                {formatDisplayDate(todayStr)})
              </strong>
            ) : (
              <span>Todo el tiempo (sin filtro de fecha)</span>
            )}
          </div>

          <div className="calendar-actions">
            <button
              type="button"
              className="calendar-action-btn calendar-btn-clear"
              onClick={handleClear}
            >
              Restablecer
            </button>
            <button
              type="button"
              className="calendar-action-btn calendar-btn-cancel"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="calendar-action-btn calendar-btn-apply"
              onClick={handleApply}
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
