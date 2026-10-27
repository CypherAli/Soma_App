// The assistant upstream has a 55s deadline; its caller waits 65s.
// The gateway must leave room for the upstream to return its own error/fallback.
export function gatewayTimeout(pathname) {
  return pathname === "/api/mobile/assistant" ? 60_000 : 45_000;
}
