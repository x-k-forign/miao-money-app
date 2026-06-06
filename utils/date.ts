function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

export function getTodayDateString(date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function getMonthString(date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

export function getNowISOString(): string {
  return new Date().toISOString();
}

export function getRecordMonth(recordDate: string): string {
  return recordDate.slice(0, 7);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function getMonthOptions(count = 12, date = new Date()): string[] {
  const currentMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  return Array.from({ length: count }, (_, index) => getMonthString(addMonths(currentMonth, -index)));
}

export function getDateOptions(monthKey: string, date = new Date()): string[] {
  const [year, month] = monthKey.split("-").map(Number);
  const isCurrentMonth = year === date.getFullYear() && month === date.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const endDay = isCurrentMonth ? date.getDate() : daysInMonth;

  return Array.from({ length: endDay }, (_, index) => `${year}-${pad2(month)}-${pad2(index + 1)}`).reverse();
}

export function formatTrendDateLabel(date: Date): string {
  return `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`;
}

export function formatTrendMonthLabel(date: Date): string {
  return `${pad2(date.getMonth() + 1)}月`;
}
