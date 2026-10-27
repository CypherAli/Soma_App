import { normalizeApiUrl } from "./api";

export function startupApi(
  stored: string,
  current: string,
  {
    development,
    allowHttp,
    bundledDefault,
    previousDefaults = [],
  }: {
    development: boolean;
    allowHttp: boolean;
    bundledDefault?: string;
    previousDefaults?: string[];
  },
) {
  if (!stored) return current;
  // Migrate only a known shipped default. A user-selected server remains untouched.
  if (
    current &&
    stored !== current &&
    (stored === bundledDefault || previousDefaults.includes(stored))
  )
    return current;
  // A new Expo development session follows Metro. Installed apps keep the server chosen by their user.
  try {
    const host = new URL(stored).hostname;
    if (
      development &&
      current &&
      stored !== current &&
      (host.endsWith(".trycloudflare.com") ||
        /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) ||
        ["localhost", "127.0.0.1"].includes(host))
    )
      return current;
    return normalizeApiUrl(stored, allowHttp);
  } catch {
    return current;
  }
}

export function expoApiHost(hostUri?: string | null) {
  if (!hostUri) return "";
  try {
    const url = new URL(
      hostUri.includes("://") ? hostUri : `http://${hostUri}`,
    );
    if (url.hostname.endsWith(".exp.direct")) return "";
    if (["localhost", "127.0.0.1", "::1"].includes(url.hostname)) return "";
    return `http://${url.hostname}:4000/api`;
  } catch {
    return "";
  }
}
