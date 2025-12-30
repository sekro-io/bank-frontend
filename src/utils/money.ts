export function formatCurrency(value: number | null) {
  if (value === null || isNaN(value)) return "";

  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export function parseCurrency(input: string): number {
  return Number(input.replace(/[^0-9.]/g, ""));
}