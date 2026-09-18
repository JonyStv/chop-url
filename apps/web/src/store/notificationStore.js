// store/notificationStore.js
import { create } from "zustand";

export const useNotificationStore = create((set, get) => {
  const push = (notification) => {
    const id = crypto.randomUUID();
    set((state) => ({
      notifications: [...state.notifications, { id, ...notification }],
    }));
    return id;
  };

  const remove = (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));

  const notify = (message, type = "info", options = {}) =>
    push({ message, type, timer: options.timer ?? 3000, kind: "toast" });

  notify.success = (msg, opts) => notify(msg, "success", opts);
  notify.error = (msg, opts) => notify(msg, "error", opts);
  notify.info = (msg, opts) => notify(msg, "info", opts);

  // 🔑 Confirmación: devuelve una Promesa<boolean>
  notify.confirm = (message, options = {}) => {
    const previous = get().notifications.find((n) => n.kind === "confirm");
    if (previous) {
      // Si ya hay un confirm activo, lo rechazamos antes de crear uno nuevo
      previous.resolve(false);
      remove(previous.id);
    }
    return new Promise((resolve) => {
      const id = push({
        kind: "confirm",
        message,
        type: options.type ?? "warning",
        confirmText: options.confirmText ?? "Confirmar",
        cancelText: options.cancelText ?? "Cancelar",
        timer: 0, // sin auto-cierre
        resolve, // guardamos el resolve para llamarlo desde el componente
      });
      // opcional: guardar el id en el resolve para cerrar por fuera
      resolve.id = id;
    });
  };

  const resolveConfirm = (id, value) => {
    const n = get().notifications.find((x) => x.id === id);
    if (n?.resolve) n.resolve(value);
    remove(id);
  };

  return {
    notifications: [],
    notify,
    remove,
    resolveConfirm,
    clear: () => set({ notifications: [] }),
  };
});
