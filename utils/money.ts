export function yuanToCents(input: string): number {
  const normalized = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error("Invalid money amount");
  }

  const [yuan, cents = ""] = normalized.split(".");
  return Number(yuan) * 100 + Number(cents.padEnd(2, "0"));
}

export function centsToYuan(cents: number): string {
  return (cents / 100).toFixed(2);
}
