import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { apiJson } from "../../config/api.js";
import "./PlanChangeModal.css";

const money = (amount, currency = "EUR") =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format((amount ?? 0) / 100);

const date = (value) =>
  value ? new Date(value).toLocaleDateString("es-ES") : "el final del ciclo actual";

export default function PlanChangeModal({
  currentPlan,
  plan,
  onClose,
  onSelect,
  cancellation = false,
}) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (cancellation) {
      setPreview({
        currentPeriodEnd: currentPlan.periodEnd,
        isCancellation: true,
        periodEnd: {
          description:
            "Tu plan seguirá activo hasta el final del ciclo actual. Después se cancelará y no se realizarán nuevos cobros.",
        },
      });
      return () => {
        cancelled = true;
      };
    }

    apiJson("/subscriptions/change-preview", {
      method: "POST",
      body: JSON.stringify({ planId: plan.id }),
    })
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message || "No se pudo calcular el cambio.");
      });
    return () => {
      cancelled = true;
    };
  }, [cancellation, currentPlan.periodEnd, plan?.id]);

  const renderTiming = (
    timing,
    title,
    description,
    actionLabel,
    apiTiming = timing,
  ) => {
    const details = preview?.[timing];
    if (!details) return null;

    return (
      <div className="plan-change-option">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
          <dl>
            <div>
              <dt>Cobro ahora</dt>
              <dd>{money(details.amount, details.currency)}</dd>
            </div>
            <div>
              <dt>Crédito generado</dt>
              <dd>{money(details.creditAmount, details.currency)}</dd>
            </div>
            <div>
              <dt>Próximo ciclo</dt>
              <dd>
                {money(
                details.nextRecurringAmountCents ??
                  (details.nextRecurringAmount != null
                    ? details.nextRecurringAmount * 100
                    : preview.newPlan.price * 100),
                details.currency,
              )}{" "}
                el {date(preview.currentPeriodEnd)}
              </dd>
            </div>
          </dl>
        </div>
        <button type="button" onClick={() => onSelect(apiTiming)}>
          {actionLabel}
        </button>
      </div>
    );
  };

  return createPortal(
    <div className="plan-change-backdrop" role="presentation" onClick={onClose}>
      <section
        className="plan-change-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-change-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="plan-change-header">
          <div>
            <p className="plan-change-kicker">Cambio de suscripción</p>
            <h2 id="plan-change-title">
              {cancellation
                ? `Cancelar ${currentPlan.name}`
                : `${currentPlan.name} → ${plan.name}`}
            </h2>
          </div>
          <button type="button" className="plan-change-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        {error && <p className="plan-change-error">{error}</p>}
        {!preview && !error && <p>Calculando importes y condiciones...</p>}
        {preview && (
          <>
            {!cancellation && (
              <div className="plan-change-summary">
                <span>Precio del nuevo plan</span>
                <strong>{preview.newPlan.price.toFixed(2)} {preview.newPlan.currency}</strong>
              </div>
            )}
            <p className="plan-change-cycle">
              El ciclo actual finaliza el <strong>{date(preview.currentPeriodEnd)}</strong>.
            </p>
            {!cancellation && preview.paymentMethod ? (
              <p className="plan-change-payment">
                Método de pago:{" "}
                {preview.paymentMethod.brand ||
                  preview.paymentMethod.bankName ||
                  preview.paymentMethod.type}{" "}
                •••• {preview.paymentMethod.last4}
              </p>
            ) : (
              <p className="plan-change-payment">No hay un método de pago guardado disponible.</p>
            )}
            {!cancellation && !preview.isFreeTarget &&
              renderTiming(
                "immediate",
                "Aplicar ahora",
                preview.immediate.description,
                preview.isUpgrade ? "Pagar y actualizar" : "Cambiar ahora",
              )}
            {!cancellation && !preview.isFreeTarget && preview.canSchedule &&
              renderTiming(
                "periodEnd",
                "Aplicar al final del ciclo",
                preview.periodEnd.description,
                "Programar cambio",
                "period_end",
              )}
            {preview.sameScheduledPlan && (
              <p className="plan-change-note">
                Este cambio ya está programado para el final del ciclo. Puedes
                aplicarlo ahora si quieres adelantarlo.
              </p>
            )}
            {!cancellation && !preview.canSchedule && (
              <p className="plan-change-note">
                La suscripción de pago se contratará mediante Stripe Checkout al continuar.
              </p>
            )}
            {!cancellation && preview.isFreeTarget && (
              <div className="plan-change-option">
                <div>
                  <h3>Aplicar al final del ciclo</h3>
                  <p>{preview.periodEnd.description}</p>
                </div>
                <button type="button" onClick={() => onSelect("period_end")}>
                  Programar cancelación
                </button>
              </div>
            )}
            {cancellation ? (
              <>
                <div className="plan-change-option">
                  <div>
                    <h3>Cancelar al final del ciclo</h3>
                    <p>{preview.periodEnd.description}</p>
                    <p>
                      Se cancelarán también los cambios de plan que estuvieran
                      programados para una fecha futura.
                    </p>
                  </div>
                  <button type="button" onClick={() => onSelect("period_end")}>
                    Confirmar cancelación
                  </button>
                </div>
                <p className="plan-change-note">
                  No se realizará ningún reembolso automático en efectivo.
                </p>
              </>
            ) : (
              <p className="plan-change-note">
                Los importes son una estimación previa de Stripe. No se realizan reembolsos
                automáticos en efectivo; los créditos se aplican a futuras facturas.
              </p>
            )}
          </>
        )}
      </section>
    </div>,
    document.body,
  );
}
