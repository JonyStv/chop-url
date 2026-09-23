import { create } from "zustand";
import { apiFetch } from "../config/api.js";

export const useEditStore = create((set, get) => ({
  isOpen: false,
  currentLink: null,
  setIsOpen: (value) => set({ isOpen: value }),
  setCurrentLink: (link) => set({ currentLink: link }),
  openEditModal: (link) => {
    set({ isOpen: true, currentLink: link });
  },
  closeEditModal: () => {
    set({ isOpen: false, currentLink: null });
  },
}));
