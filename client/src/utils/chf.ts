export function formatCHF(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  const fixed = safeValue.toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const withApostrophe = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return `${withApostrophe}.${decPart} CHF`;
}

export function sanitizeFileNamePart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}
