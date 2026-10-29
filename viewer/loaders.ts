import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { MAT, pickCat, organMat } from "./shared/layers";
import { decodeModelResponse } from "./shared/modelDownload";
import type { Atlas } from "./shared/anatomy";
import type { ViewerConfig } from "./contracts";
import { resourceUrl } from "./resources";
import type { ViewerStructure } from "../src/components/Viewer.types";

export interface LoadedPart {
  info: ViewerStructure;
  root: THREE.Group;
  meshes: THREE.Mesh[];
  categories: string[];
}
const sanitize = (name: string) => THREE.PropertyBinding.sanitizeNodeName(name);
const address = (key: string) => resourceUrl(`../assets/${key}`);

export async function loadAtlas(
  config: ViewerConfig,
  signal: AbortSignal,
  progress: (value: string) => void,
): Promise<LoadedPart[]> {
  const response = await fetch(resourceUrl(config.atlasPath), {
    signal,
  });
  if (!response.ok) throw Error("Không tải được danh mục Atlas.");
  const atlas: Atlas = await response.json();
  const ids = new Set(config.scene.groups.flatMap((group) => group.parts));
  const source = atlas.parts.filter((part) => ids.has(part.id));
  if (source.length !== ids.size)
    throw Error("Dữ liệu Atlas và nội dung chưa đồng bộ.");
  const layers = config.scene.layers;
  const result: LoadedPart[] = [];
  const chunks = [...new Set(source.map((part) => part.chunk))];
  for (const chunkIndex of chunks) {
    const chunk = atlas.chunks[chunkIndex];
    const compressed =
      !!chunk.gzip && typeof DecompressionStream !== "undefined";
    const raw = await fetch(address(compressed ? chunk.gzip! : chunk.url), {
      signal,
    });
    const bytes = await decodeModelResponse(raw, chunk.bytes, compressed);
    for (const part of source.filter((part) => part.chunk === chunkIndex)) {
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(
          new Float32Array(bytes, part.positions, part.vertexCount * 3).slice(),
          3,
        ),
      );
      geometry.setAttribute(
        "normal",
        new THREE.BufferAttribute(
          new Int16Array(bytes, part.normals, part.vertexCount * 3).slice(),
          3,
          true,
        ),
      );
      geometry.setIndex(
        new THREE.BufferAttribute(
          new Uint32Array(bytes, part.indices, part.indexCount).slice(),
          1,
        ),
      );
      geometry.computeBoundingSphere();
      const groups = config.scene.groups.filter((group) =>
        group.parts.includes(part.id),
      );
      const tint = groups.filter((group) => group.tint).at(-1)?.tint;
      const material = new THREE.MeshStandardMaterial({
        color:
          tint ??
          config.systems.find((system) => system.id === part.system)?.color ??
          "#bda98d",
        roughness: 0.53,
        metalness: 0.08,
        side: THREE.FrontSide,
      });
      const mesh = new THREE.Mesh(geometry, material),
        root = new THREE.Group();
      root.name = part.id;
      root.add(mesh);
      const info: ViewerStructure = {
        ...config.parts[part.id],
        id: part.id,
        meshName: part.id,
        label: config.parts[part.id]?.label || part.name,
        english: part.name,
        latin: config.parts[part.id]?.latin ?? "",
        note:
          config.parts[part.id]?.note ||
          groups
            .map((group) => group.note?.vi)
            .filter(Boolean)
            .join("\n\n"),
        category: part.system,
        kind: "part",
        parentLabel: groups.map((group) => group.name.vi).join(" · "),
      };
      result.push({
        info,
        root,
        meshes: [mesh],
        categories: layers?.length
          ? layers
              .filter((layer) =>
                layer.groups.some((key) =>
                  groups.some((group) => group.key === key),
                ),
              )
              .map((layer) => layer.key)
          : groups.map((group) => group.key),
      });
      if (result.length % 16 === 0) {
        progress(`Đang dựng ${result.length}/${source.length} cấu trúc…`);
        await new Promise<void>((done) => setTimeout(done, 0));
      }
    }
  }
  return result;
}

export async function loadGlb(
  config: ViewerConfig,
  signal: AbortSignal,
): Promise<LoadedPart[]> {
  const response = await fetch(
    resourceUrl(
      config.modelPath ||
        `../models/${encodeURIComponent(config.model.id)}/file`,
    ),
    { signal },
  );
  if (!response.ok)
    throw Error("Không tải được mô hình. Kiểm tra kết nối và thử lại.");
  const data = await response.arrayBuffer();
  const manager = new THREE.LoadingManager();
  manager.setURLModifier(resourceUrl);
  const draco = new DRACOLoader(manager);
  draco.setDecoderPath(
    new URL("../runtime/", config.resourceBase || location.href).href,
  );
  draco.setWorkerLimit(1);
  const loader = new GLTFLoader(manager);
  loader.setDRACOLoader(draco);
  try {
    const gltf = await loader.parseAsync(data, "");
    const materials = new Set<THREE.Material>(),
      parts = new Map<string, LoadedPart>();
    const details = new Map(
      config.model.structures.map((info) => [sanitize(info.meshName), info]),
    );
    gltf.scene.updateMatrixWorld(true);
    const meshes: THREE.Mesh[] = [];
    gltf.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) meshes.push(object);
    });
    for (const mesh of meshes) {
      let name = mesh.name;
      for (
        let node: THREE.Object3D | null = mesh;
        node && node !== gltf.scene;
        node = node.parent
      ) {
        const association = gltf.parser.associations.get(node);
        if (association?.nodes !== undefined) {
          name = gltf.parser.json.nodes[association.nodes]?.name || name;
          break;
        }
      }
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(
        (material) => materials.add(material),
      );
      const category = pickCat(name);
      const material = (
        category === "organ" ? organMat(name) : MAT[category]
      ).clone();
      material.side = THREE.FrontSide;
      mesh.material = material;
      const part = parts.get(name) ?? {
        info: {
          ...details.get(sanitize(name)),
          id: name,
          meshName: name,
          label: details.get(sanitize(name))?.label ?? name.replace(/_/g, " "),
          english: name.replace(/_/g, " "),
          latin: details.get(sanitize(name))?.latin ?? "",
          note: details.get(sanitize(name))?.note ?? "",
          category,
          kind: "part" as const,
        },
        root: new THREE.Group(),
        meshes: [],
        categories: [category],
      };
      // Flatten source transforms once, then move the owning structure as a unit.
      part.root.attach(mesh);
      part.meshes.push(mesh);
      parts.set(name, part);
    }
    materials.forEach((material) => material.dispose());
    return [...parts.values()];
  } finally {
    draco.dispose();
  }
}
