export function dateText(
  value: string | undefined | null,
  language: "vi" | "en",
) {
  return value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleDateString(language === "en" ? "en-GB" : "vi-VN")
    : "—";
}
