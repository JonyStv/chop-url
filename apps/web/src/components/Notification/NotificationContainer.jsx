// components/NotificationContainer.jsx
import { createPortal } from "react-dom";
import { useNotificationStore } from "../../store/notificationStore.js";
import Notification from "./Notification";
import ConfirmNotification from "./ConfirmNotification";

export default function NotificationContainer() {
  const notifications = useNotificationStore((s) => s.notifications);
  const remove = useNotificationStore((s) => s.remove);
  const resolveConfirm = useNotificationStore((s) => s.resolveConfirm);

  return createPortal(
    <div className="notification-container">
      {notifications.map((n) => {
        if (n.kind === "confirm") {
          return (
            <ConfirmNotification
              key={n.id}
              message={n.message}
              type={n.type}
              confirmText={n.confirmText}
              cancelText={n.cancelText}
              onConfirm={() => resolveConfirm(n.id, true)}
              onCancel={() => resolveConfirm(n.id, false)}
            />
          );
        }

        return (
          <Notification
            key={n.id}
            message={n.message}
            type={n.type}
            timer={n.timer}
            onClose={() => remove(n.id)}
          />
        );
      })}
    </div>,
    document.body,
  );
}
