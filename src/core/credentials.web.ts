import type { Credential } from "./types";
// Keep the browser session in this tab only so an OAuth redirect can restore it.
// Never put bearer tokens in localStorage or in the redirect URL.
const KEY = "soma.credential.tab.v1";
let credential: Credential | null = null;
export async function readCredential() {
  if (!credential && typeof window !== "undefined") {
    const raw = sessionStorage.getItem(KEY);
    if (raw) {
      try {
        const value = JSON.parse(raw) as Partial<Credential>;
        if (
          typeof value.token === "string" &&
          typeof value.userId === "string" &&
          typeof value.apiUrl === "string" &&
          typeof value.expiresAt === "string" &&
          Date.parse(value.expiresAt) > Date.now()
        )
          credential = value as Credential;
        else sessionStorage.removeItem(KEY);
      } catch {
        sessionStorage.removeItem(KEY);
      }
    }
  }
  return credential;
}
export async function writeCredential(value: Credential | null) {
  if (typeof window !== "undefined") {
    if (value) sessionStorage.setItem(KEY, JSON.stringify(value));
    else sessionStorage.removeItem(KEY);
  }
  credential = value;
}
