import { useState, useCallback } from "react";

// Hook for handling selection state. Supports single-select (radio-like) and multi-select.
export default function useSelection({ initial = [], single = false } = {}) {
  const [selected, setSelected] = useState(new Set(initial));

  const has = useCallback((id) => selected.has(id), [selected]);

  const toggle = useCallback(
    (id) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (single) {
          return next.has(id) ? new Set() : new Set([id]);
        }
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [single],
  );

  const addMany = useCallback((ids) => {
    if (!ids || ids.length === 0) return;
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const removeMany = useCallback((ids) => {
    if (!ids || ids.length === 0) return;
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  }, []);

  const selectAll = useCallback(
    (ids) => {
      if (!ids) return;
      if (single) {
        setSelected(ids.length > 0 ? new Set([ids[0]]) : new Set());
      } else {
        setSelected(new Set(ids));
      }
    },
    [single],
  );

  const clear = useCallback(() => setSelected(new Set()), []);

  const allChecked = useCallback(
    (ids) => {
      if (!ids || ids.length === 0) return false;
      return ids.every((id) => selected.has(id));
    },
    [selected],
  );

  return {
    selected,
    has,
    toggle,
    addMany,
    removeMany,
    selectAll,
    clear,
    allChecked,
  };
}
