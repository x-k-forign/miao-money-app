import { create } from "zustand";

type AnalysisRange = "7d" | "30d";

interface AnalysisState {
  range: AnalysisRange;
  categoryId?: string;
  setRange: (range: AnalysisRange) => void;
  setCategoryId: (categoryId?: string) => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  range: "7d",
  setRange: (range) => set({ range }),
  setCategoryId: (categoryId) => set({ categoryId })
}));
