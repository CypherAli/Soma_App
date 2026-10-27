export function createOfflineDocument(config: object, runtime: string, template: string) {
  const safeConfig = JSON.stringify(config).replace(/</g, "\\u003c");
  return template.replace("/*__SOMA_CONFIG__*/", () => `window.SOMA_VIEWER_CONFIG=${safeConfig};`)
    .replace(/<script type="module" src="[^"]+"><\/script>/, () => `<script>${runtime.replace(/<\/script/gi, "<\\/script")}</script>`);
}
