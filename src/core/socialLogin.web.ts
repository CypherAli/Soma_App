import { apiRequest } from "./api";
import { checkAuthorizeUrl, readOAuthReturn, type Provider } from "./oauthProtocol";
import type { AuthResponse } from "./types";

const KEY = "soma.oauth.pending.web.v1";
type Pending = {
  base: string;
  verifier: string;
  state: string;
  next?: string;
  expiresAt: number;
  returnUrl: string;
  ownerId?: string;
};
export const socialReturnUrl = () =>
  typeof window === "undefined" ? "" : `${window.location.origin}/oauth`;
const random = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");

export async function startSocialLogin(
  base: string,
  provider: Provider,
  next?: string,
  link?: {
    ownerId: string;
    start: (proof: { challenge: string; state: string; returnUrl: string }) => Promise<{ url: string }>;
  },
): Promise<null> {
  if (!window.isSecureContext || !crypto.subtle)
    throw Error("Mở app bằng localhost hoặc HTTPS để đăng nhập an toàn.");
  const verifier = random(), state = random();
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  const challenge = btoa(String.fromCharCode(...digest)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const pending: Pending = { base, verifier, state, next, ownerId: link?.ownerId, expiresAt: Date.now() + 600000, returnUrl: socialReturnUrl() };
  // Keep the proof in this tab only. The provider receives the challenge, never the verifier.
  sessionStorage.setItem(KEY, JSON.stringify(pending));
  try {
    const proof = { challenge, state, returnUrl: pending.returnUrl };
    const { url } = link ? await link.start(proof) : await apiRequest<{ url: string }>(base, `/auth/mobile/oauth/${provider}`, { method: "POST", body: proof });
    // A same-tab redirect works without popup permissions, including in an app window.
    (window.top || window).location.assign(checkAuthorizeUrl(url, provider));
    return await new Promise<never>(() => {});
  } catch (error) {
    sessionStorage.removeItem(KEY);
    throw error;
  }
}

let completed: { url: string; base: string; promise: Promise<{ auth: AuthResponse; next?: string; ownerId?: string }> } | null = null;
export function finishSocialLogin(base: string, url: string) {
  if (completed?.url === url && completed.base === base) return completed.promise;
  const promise = (async () => {
    const raw = sessionStorage.getItem(KEY);
    const pending: Pending | null = raw ? JSON.parse(raw) : null;
    if (!pending || pending.base !== base || pending.returnUrl !== socialReturnUrl() || pending.expiresAt <= Date.now())
      throw Error("Yêu cầu đăng nhập đã hết hạn. Vui lòng bắt đầu lại trên app.");
    const code = readOAuthReturn(url, pending.state, pending.returnUrl);
    const auth = await apiRequest<AuthResponse>(base, "/auth/mobile/exchange", { method: "POST", body: { code, verifier: pending.verifier } });
    if (pending.ownerId && auth.user.id !== pending.ownerId) throw Error("Liên kết không khớp tài khoản hiện tại.");
    sessionStorage.removeItem(KEY);
    return { auth, next: pending.next, ownerId: pending.ownerId };
  })().finally(() => { if (completed?.promise === promise) completed = null; });
  completed = { url, base, promise };
  return promise;
}
