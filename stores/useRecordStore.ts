import { create } from "zustand";
import { getMonthString } from "@/utils/date";

interface RecordState {
  currentMonth: string;
  refreshKey: number;
  setCurrentMonth: (month: string) => void;
  requestRefresh: () => void;
}

export const useRecordStore = create<RecordState>((set) => ({
  currentMonth: getMonthString(),
  refreshKey: 0,
  setCurrentMonth: (currentMonth) => set({ currentMonth }),
  requestRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 }))
}));
