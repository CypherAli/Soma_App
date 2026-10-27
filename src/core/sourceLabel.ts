export const sourceDisplayLabel = (value: string) =>
  value
    .replace(/\bdr[.\s]*l[âa]m\b/giu, "")
    .replace(/\s+\.(pdf|docx)\b/gi, ".$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
