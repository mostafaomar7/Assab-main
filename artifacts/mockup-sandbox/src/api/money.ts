// All API amounts are integer halalas (1 SAR = 100 halalas).

const arFormatter = new Intl.NumberFormat("ar-SA", {
  style: "currency",
  currency: "SAR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const enFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "SAR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function halalasToSAR(halalas: number): number {
  return halalas / 100;
}

export function sarToHalalas(sar: number): number {
  return Math.round(sar * 100);
}

export function formatHalalas(
  halalas: number | null | undefined,
  lang: "ar" | "en" = "ar",
): string {
  if (halalas == null) return "—";
  const fmt = lang === "ar" ? arFormatter : enFormatter;
  return fmt.format(halalasToSAR(halalas));
}

export function formatSAR(
  sar: number | null | undefined,
  lang: "ar" | "en" = "ar",
): string {
  if (sar == null) return "—";
  const fmt = lang === "ar" ? arFormatter : enFormatter;
  return fmt.format(sar);
}
