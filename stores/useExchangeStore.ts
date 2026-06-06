import { create } from "zustand";
import type { CurrencyCode } from "@/types/models";

interface ExchangeState {
  amount: string;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  setAmount: (amount: string) => void;
  swapCurrencies: () => void;
}

export const useExchangeStore = create<ExchangeState>((set) => ({
  amount: "100",
  fromCurrency: "CNY",
  toCurrency: "USD",
  setAmount: (amount) => set({ amount }),
  swapCurrencies: () =>
    set((state) => ({
      fromCurrency: state.toCurrency,
      toCurrency: state.fromCurrency
    }))
}));
