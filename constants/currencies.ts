import type { CurrencyCode } from "@/types/models";

export const supportedCurrencies: CurrencyCode[] = ["CNY", "USD", "EUR", "JPY", "HKD", "GBP", "KRW"];

export const currencyLabels: Record<CurrencyCode, string> = {
  CNY: "人民币",
  USD: "美元",
  EUR: "欧元",
  JPY: "日元",
  HKD: "港币",
  GBP: "英镑",
  KRW: "韩元"
};
