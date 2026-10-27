const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
config.maxWorkers = 2;
// Expo Go's Android downloader can reject chunked multipart progress responses.
// A regular JS response keeps the same bundle and avoids that transport path.
const enhance = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const nextMiddleware = enhance ? enhance(middleware, server) : middleware;
  return (request, response, next) => {
    if (process.env.SOMA_DEV_API_PROXY === "1" && request.url?.startsWith("/api/")) {
      // Reuse the existing mobile-only allowlist, body limits and throttling.
      void import("./scripts/share-preview.mjs").then(({ mobileShareServer }) => {
        mobileShareServer.emit("request", request, response);
      }).catch(() => { if (!response.headersSent) response.writeHead(502); response.end(); });
      return;
    }
    if (request.url?.includes(".bundle") && request.headers.accept?.includes("multipart/mixed")) {
      request.headers.accept = "application/javascript";
      request.headers["accept-encoding"] = "identity";
    }
    return nextMiddleware(request, response, next);
  };
};
config.resolver.assetExts.push("soma");
module.exports = config;
