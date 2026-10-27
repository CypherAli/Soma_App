export function resourceUrl(value: string) {
  const config = window.SOMA_VIEWER_CONFIG;
  if (value.startsWith("data:") || value.startsWith("blob:")) return value;
  const url = new URL(value, config.resourceBase || location.href);
  if (config.inlineAssets) {
    const asset = config.inlineAssets[url.pathname.split("/").at(-1)!];
    if (!asset)
      throw Error(
        "Bản mô hình trên thiết bị thiếu tài nguyên. Hãy cập nhật ứng dụng.",
      );
    return asset;
  }
  return url.href;
}
