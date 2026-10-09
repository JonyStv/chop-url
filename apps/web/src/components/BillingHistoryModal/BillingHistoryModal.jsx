import { useEffect, useState } from "react";
import { apiJson } from "../../config/api.js";
import "./BillingHistoryModal.css";

const STATUS_CONFIG = {
  paid:      { label: 'Pagado',      variant: 'success' },
  pending:   { label: 'Pendiente',   variant: 'warning' },
  cancelled: { label: 'Cancelado',   variant: 'danger'  },
  refunded:  { label: 'Reembolsado', variant: 'info'    },
  draft:     { label: 'Borrador',    variant: 'neutral' },
};

function StatusLabel({ status }) {
  const {label, variant} = STATUS_CONFIG[status] ?? {
    label: status,
    variant: 'neutral',
  };

  return (
    <span
      className={`status-badge status-${variant}`}
    >
      {label}
    </span>
  );
}
const formatMoney = (amount, currency = "EUR") =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format((amount ?? 0) / 100);

const formatDate = (timestamp) =>
  timestamp
    ? new Date(timestamp * 1000).toLocaleDateString("es-ES")
    : "No disponible";

export default function BillingHistoryModal({ onClose }) {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiJson("/subscriptions/billing-summary")
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message || "No se pudo cargar la facturación.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="billing-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="billing-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="billing-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="billing-modal-header">
          <h2 id="billing-modal-title">Facturación</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">×</button>
        </header>
        {error && <p className="billing-error">{error}</p>}
        {!summary && !error && <p>Cargando información de facturación...</p>}
        {summary && (
          <>
            <div className="billing-balance">
              <span>Saldo para futuras facturas</span>
              <strong>
                {summary.balance > 0 ? "-" : summary.balance < 0 ? "+" : ""}
                {formatMoney(Math.abs(summary.balance), summary.currency)}
              </strong>
            </div>
            <div className="billing-next">
              <h3>Siguiente pago</h3>
              {summary.nextPayment ? (
                <p>
                  {formatMoney(summary.nextPayment.amount, summary.nextPayment.currency)} el{" "}
                  {formatDate(summary.nextPayment.date)}
                </p>
              ) : (
                <p>No hay pagos programados.</p>
              )}
            </div>
            <div>
              <h3>Historial de pagos</h3>
              {summary.invoices.length === 0 ? (
                <p>No hay facturas todavía.</p>
              ) : (
                <ul className="billing-invoice-list">
                  {summary.invoices.map((invoice) => (
                    <li key={invoice.id}>
                      <span>{formatDate(invoice.date)}</span>
                      <strong>{formatMoney(invoice.amount, invoice.currency)}</strong>
                      <StatusLabel status={invoice.status} />
                      {invoice.hostedInvoiceUrl && (
                        <a href={invoice.hostedInvoiceUrl} target="_blank" rel="noreferrer">
                          Ver factura
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
