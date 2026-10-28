import { resolve } from "node:path";

export function gatewayConfig(env, root) {
  const production = env.NODE_ENV === "production";
  if (production && !env.SOMA_UPSTREAM_URL)
    throw Error("Production requires SOMA_UPSTREAM_URL.");
  const upstream = new URL(env.SOMA_UPSTREAM_URL || "http://127.0.0.1:4000");
  if (
    !["http:", "https:"].includes(upstream.protocol) ||
    upstream.username ||
    upstream.password ||
    upstream.search ||
    upstream.hash ||
    upstream.pathname !== "/"
  )
    throw Error(
      "SOMA_UPSTREAM_URL must be an HTTP(S) origin without credentials.",
    );
  const port = Number(env.PORT || 8083);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw Error("PORT must be an integer between 1 and 65535.");
  if (production && !env.SOMA_MOBILE_ALLOWLIST)
    throw Error("Production requires SOMA_MOBILE_ALLOWLIST.");
  return {
    upstream,
    port,
    host: production ? "::" : "127.0.0.1",
    manifest: resolve(
      root,
      env.SOMA_MOBILE_ALLOWLIST || "../soma_be/resources/mobile/manifest.json",
    ),
  };
}
