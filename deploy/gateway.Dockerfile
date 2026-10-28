FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV SOMA_MOBILE_ALLOWLIST=/app/deploy/mobile-allowlist.json
COPY --chown=node:node package.json ./
COPY --chown=node:node scripts/share-preview.mjs scripts/share-preview.mjs
COPY --chown=node:node scripts/lib/gateway-policy.mjs scripts/lib/gateway-config.mjs scripts/lib/
COPY --chown=node:node deploy/mobile-allowlist.json deploy/mobile-allowlist.json
USER node
CMD ["node", "scripts/share-preview.mjs"]
