export default function ConfirmNotification({
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  type = "warning",
  onConfirm,
  onCancel,
  choices,
  onChoice,
}) {
  return (
    <div
      className={`notification notification--${type} notification--confirm`}
      role="alertdialog"
    >
      <span>{message}</span>
      <div className="notification__actions">
        {choices ? choices.map((choice) => (
          <button
            key={choice.value}
            className="notification__btn notification__btn--choice"
            onClick={() => onChoice(choice.value)}
          >
            {choice.label}
          </button>
        )) : (
          <>
            <button
              className="notification__btn notification__btn--cancel"
              onClick={onCancel}
              aria-label={cancelText}
              title={cancelText}
            >
              ✕
            </button>
            <button
              className="notification__btn notification__btn--confirm"
              onClick={onConfirm}
              aria-label={confirmText}
              title={confirmText}
            >
              ✓
            </button>
          </>
        )}
      </div>
    </div>
  );
}
