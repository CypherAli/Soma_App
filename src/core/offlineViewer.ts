/* eslint-disable @typescript-eslint/no-require-imports -- Metro needs literal imports for bundled .soma assets. */
import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import { OFFLINE_MODELS, OFFLINE_BUFFERS } from "./offlineRegistry";
import { createOfflineDocument } from "./offlineDocument";

async function assetText(module: number) {
  const asset = await Asset.fromModule(module).downloadAsync();
  if (!asset.localUri) throw Error("Chưa đọc được dữ liệu 3D trên thiết bị.");
  return new File(asset.localUri).text();
}
let runtime: Promise<string> | undefined;
let template: Promise<string> | undefined;
let decoder: Promise<Record<string, string>> | undefined;
export async function offlineViewerHtml(uri: string) {
  const url = new URL(uri);
  const id = url.pathname.split("/").at(-1)!;
  const module = OFFLINE_MODELS[id];
  if (!module) return null;
  runtime ??= assetText(require("../../assets/offline/runtime.soma")).catch(
    (error) => {
      runtime = undefined;
      throw error;
    },
  );
  template ??= assetText(require("../../assets/offline/template.soma")).catch(
    (error) => {
      template = undefined;
      throw error;
    },
  );
  const [packText, js, html] = await Promise.all([
    assetText(module),
    runtime,
    template,
  ]);
  const pack = JSON.parse(packText);
  const inlineAssets: Record<string, string> = {};
  await Promise.all(
    Object.entries(pack.buffers as Record<string, string>).map(
      async ([key, hash]) => {
        const asset = await Asset.fromModule(
          OFFLINE_BUFFERS[hash],
        ).downloadAsync();
        if (!asset.localUri)
          throw Error("Chưa đọc được mô hình trên thiết bị.");
        inlineAssets[key] =
          `data:application/octet-stream;base64,${await new File(asset.localUri).base64()}`;
      },
    ),
  );
  if (pack.config.model.kind === "glb") {
    decoder ??= assetText(require("../../assets/offline/decoder.soma"))
      .then(JSON.parse)
      .catch((error) => {
        decoder = undefined;
        throw error;
      });
    Object.assign(inlineAssets, await decoder);
  }
  const config = {
    ...pack.config,
    inlineAssets,
    dark: url.searchParams.get("theme") === "dark",
    preview: url.searchParams.get("preview") === "1",
  };
  return createOfflineDocument(config, js, html);
}
