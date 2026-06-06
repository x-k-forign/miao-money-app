import { Platform } from "react-native";
import { mockExchangeRates } from "@/constants/mockData";
import { getTodayDateString } from "@/utils/date";
import { createLocalId } from "@/utils/id";
import type { CurrencyCode } from "@/types/models";

interface FrankfurterResponse {
  rates: Partial<Record<CurrencyCode, number>>;
}

interface ExchangeRateResult {
  rate: string;
  rateDate: string;
  source: "cache" | "network" | "fallback" | "mock";
}

export async function getExchangeRate(
  baseCurrency: CurrencyCode,
  targetCurrency: CurrencyCode
): Promise<string> {
  const result = await getExchangeRateDetail(baseCurrency, targetCurrency);
  return result.rate;
}

export async function getExchangeRateDetail(
  baseCurrency: CurrencyCode,
  targetCurrency: CurrencyCode
): Promise<ExchangeRateResult> {
  if (baseCurrency === targetCurrency) {
    return {
      rate: "1",
      rateDate: getTodayDateString(),
      source: Platform.OS === "web" ? "mock" : "cache"
    };
  }

  if (Platform.OS === "web") {
    return {
      rate: String(mockExchangeRates[baseCurrency] / mockExchangeRates[targetCurrency]),
      rateDate: getTodayDateString(),
      source: "mock"
    };
  }

  const today = getTodayDateString();
  const { findCachedExchangeRate, findLatestExchangeRate, upsertExchangeRate } = await import(
    "@/db/queries/exchangeRates"
  );
  const cached = await findCachedExchangeRate(baseCurrency, targetCurrency, today);
  if (cached) {
    return {
      rate: cached.rate,
      rateDate: cached.rateDate,
      source: "cache"
    };
  }

  try {
    const response = await fetch(
      `https://api.frankfurter.app/latest?from=${baseCurrency}&to=${targetCurrency}`
    );
    if (!response.ok) {
      throw new Error(`Exchange API failed: ${response.status}`);
    }

    const data = (await response.json()) as FrankfurterResponse;
    const rate = data.rates[targetCurrency];
    if (!rate) {
      throw new Error("Exchange API response missing target currency");
    }

    const rateText = String(rate);
    await upsertExchangeRate({
      id: createLocalId("rate"),
      baseCurrency,
      targetCurrency,
      rate: rateText,
      rateDate: today,
      fetchedAt: new Date().toISOString()
    });

    return {
      rate: rateText,
      rateDate: today,
      source: "network"
    };
  } catch (error) {
    const fallback = await findLatestExchangeRate(baseCurrency, targetCurrency);
    if (fallback) {
      return {
        rate: fallback.rate,
        rateDate: fallback.rateDate,
        source: "fallback"
      };
    }

    throw error;
  }
}
