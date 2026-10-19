import * as SecureStore from "expo-secure-store";
import type { Credential } from "./types";
const key = "soma.auth.v1";
export async function readCredential(): Promise<Credential | null> {
  const raw = await SecureStore.getItemAsync(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Credential;
  } catch {
    return null;
  }
}
export async function writeCredential(value: Credential | null) {
  if (value)
    await SecureStore.setItemAsync(key, JSON.stringify(value), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  else await SecureStore.deleteItemAsync(key);
}
