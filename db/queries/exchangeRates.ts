import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { exchangeRates, type ExchangeRate, type NewExchangeRate } from "@/db/schema";
import type { CurrencyCode } from "@/types/models";

export async function upsertExchangeRate(input: NewExchangeRate): Promise<void> {
  await db
    .insert(exchangeRates)
    .values(input)
    .onConflictDoUpdate({
      target: [exchangeRates.baseCurrency, exchangeRates.targetCurrency, exchangeRates.rateDate],
      set: {
        rate: input.rate,
        fetchedAt: input.fetchedAt
      }
    });
}

export async function findCachedExchangeRate(
  baseCurrency: CurrencyCode,
  targetCurrency: CurrencyCode,
  rateDate: string
): Promise<ExchangeRate | undefined> {
  const [cached] = await db
    .select()
    .from(exchangeRates)
    .where(
      and(
        eq(exchangeRates.baseCurrency, baseCurrency),
        eq(exchangeRates.targetCurrency, targetCurrency),
        eq(exchangeRates.rateDate, rateDate)
      )
    );

  return cached;
}

export async function findLatestExchangeRate(
  baseCurrency: CurrencyCode,
  targetCurrency: CurrencyCode
): Promise<ExchangeRate | undefined> {
  const [cached] = await db
    .select()
    .from(exchangeRates)
    .where(and(eq(exchangeRates.baseCurrency, baseCurrency), eq(exchangeRates.targetCurrency, targetCurrency)))
    .orderBy(desc(exchangeRates.rateDate))
    .limit(1);

  return cached;
}
