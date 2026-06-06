import { create } from "zustand";

interface SubscriptionState {
  refreshKey: number;
  requestRefresh: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  refreshKey: 0,
  requestRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 }))
}));
