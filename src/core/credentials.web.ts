import type { Credential } from "./types";
// Browser preview keeps bearer tokens in memory. Android uses encrypted SecureStore.
let credential: Credential | null = null;
export async function readCredential() {
  return credential;
}
export async function writeCredential(value: Credential | null) {
  credential = value;
}
