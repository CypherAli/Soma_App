import { Platform } from "react-native";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { apiRequest } from "./api";
import {
  checkAuthorizeUrl,
  OAUTH_RETURN,
  readOAuthReturn,
  type Provider,
} from "./oauthProtocol";
import type { AuthResponse } from "./types";

const KEY = "soma.oauth.pending.v1";
type Pending = {
  base: string;
  verifier: string;
  state: string;
  next?: string;
  expiresAt: number;
};
const random = () =>
  Array.from(Crypto.getRandomBytes(32), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");

export async function startSocialLogin(
  base: string,
  provider: Provider,
  next?: string,
) {
  if (Platform.OS === "web")
    throw new Error(
      "Hãy dùng đăng nhập mạng xã hội trong ứng dụng Android hoặc trên web Soma.",
    );
  const verifier = random(),
    state = random();
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 },
  );
  const challenge = digest
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const pending: Pending = {
    base,
    verifier,
    state,
    next,
    expiresAt: Date.now() + 600000,
  };
  // Persist the proof before opening the system browser, including after process death.
  await SecureStore.setItemAsync(KEY, JSON.stringify(pending), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  try {
    const { url } = await apiRequest<{ url: string }>(
      base,
      `/auth/mobile/oauth/${provider}`,
      {
        method: "POST",
        body: { challenge, state },
      },
    );
    const result = await WebBrowser.openAuthSessionAsync(
      checkAuthorizeUrl(url, provider),
      OAUTH_RETURN,
    );
    if (result.type === "success") return result.url;
    // Do not clear the proof here: Android may deliver the deep link before the browser result.
    return null;
  } catch (error) {
    await SecureStore.deleteItemAsync(KEY);
    throw error;
  }
}

let completed: {
  url: string;
  base: string;
  promise: Promise<{ auth: AuthResponse; next?: string }>;
} | null = null;
export function finishSocialLogin(base: string, url: string) {
  if (completed?.url === url && completed.base === base)
    return completed.promise;
  const promise = (async () => {
    const raw = await SecureStore.getItemAsync(KEY);
    const pending = raw ? (JSON.parse(raw) as Pending) : null;
    if (!pending || pending.base !== base || pending.expiresAt <= Date.now())
      throw new Error(
        "Yêu cầu đăng nhập đã hết hạn. Vui lòng bắt đầu lại trên app.",
      );
    const code = readOAuthReturn(url, pending.state);
    const auth = await apiRequest<AuthResponse>(base, "/auth/mobile/exchange", {
      method: "POST",
      body: { code, verifier: pending.verifier },
    });
    await SecureStore.deleteItemAsync(KEY);
    return { auth, next: pending.next };
  })().finally(() => {
    if (completed?.promise === promise) completed = null;
  });
  completed = { url, base, promise };
  return promise;
}
