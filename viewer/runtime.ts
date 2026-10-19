import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
// The existing web project remains the only authority for anatomy colours and categories.
import {
  CATS,
  MAT,
  ORGAN_ALL_SUBMATS,
  pickCat,
  organMat,
} from "../../Soma_Fe/src/lib/anatomy/layers";

interface Structure {
  id: string;
  meshName: string;
  label: string;
  english: string;
  latin: string;
  note: string;
}
interface Config {
  dark: boolean;
  model: { id: string; structures: Structure[] };
}
declare global {
  interface Window {
    SOMA_VIEWER_CONFIG: Config;
    ReactNativeWebView?: { postMessage: (value: string) => void };
    somaMobileCommand?: (value: {
      type: string;
      meshName?: string;
      category?: string;
      visible?: boolean;
      side?: "left" | "right" | "both";
      factor?: number;
    }) => void;
  }
}
const config = window.SOMA_VIEWER_CONFIG;
const stage = document.getElementById("stage")!,
  status = document.getElementById("status")!;
if (config.dark) {
  document.body.style.background = "#202834";
  document.body.style.color = "#edf1f7";
}
function send(type: string, data: object = {}) {
  const message = { source: "soma-mobile-viewer", type, ...data };
  if (window.ReactNativeWebView)
    window.ReactNativeWebView.postMessage(JSON.stringify(message));
  else if (window.parent !== window) window.parent.postMessage(message, "*");
}
function fail(message: string) {
  status.hidden = false;
  status.className = "error";
  status.textContent = message;
  send("error", { message });
}
window.addEventListener("error", () =>
  fail(
    "Trình xem 3D chưa khởi động được trên thiết bị này. Hãy thử mở lại mô hình.",
  ),
);
const renderer = new THREE.WebGLRenderer({
  antialias: false,
  alpha: false,
  powerPreference: "low-power",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(config.dark ? "#202834" : "#f1f3f5");
stage.appendChild(renderer.domElement);
const scene = new THREE.Scene(),
  camera = new THREE.PerspectiveCamera(40, 1, 0.005, 100);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = false;
controls.minDistance = 1.3;
controls.maxDistance = 14;
controls.screenSpacePanning = true;
scene.add(new THREE.HemisphereLight("#ffffff", "#6b7280", 2.2));
const light = new THREE.DirectionalLight("#ffffff", 2.3);
light.position.set(4, 6, 5);
scene.add(light);
const fill = new THREE.DirectionalLight("#dce9ff", 0.9);
fill.position.set(-3, 1, -2);
scene.add(fill);
const group = new THREE.Group();
scene.add(group);
const meshes: THREE.Mesh[] = [],
  materialPool = new Set<THREE.Material>(),
  geometryPool = new Set<THREE.BufferGeometry>();
interface Part {
  name: string;
  category: ReturnType<typeof pickCat>;
  meshes: THREE.Mesh[];
}
const parts = new Map<string, Part>();
const meshParts = new WeakMap<THREE.Mesh, Part>();
const details = new Map<string, Structure>();
const sanitize = (name: string) => THREE.PropertyBinding.sanitizeNodeName(name);
for (const structure of config.model.structures)
  details.set(sanitize(structure.meshName), structure);
let selected: Part | null = null,
  frame = 0,
  disposed = false;
let handSide: "left" | "right" | "both" = "right";
const hiddenCategories = new Set<string>();
function partSide(part: Part): "left" | "right" | "both" {
  return /[._]l$/i.test(part.name)
    ? "left"
    : /[._]r$/i.test(part.name)
      ? "right"
      : "both";
}
function applyVisibility() {
  for (const part of parts.values()) {
    const showSide =
      config.model.id !== "ban-tay" ||
      handSide === "both" ||
      partSide(part) === handSide ||
      partSide(part) === "both";
    part.meshes.forEach((mesh) => {
      mesh.visible = showSide && !hiddenCategories.has(part.category);
    });
  }
}
function render() {
  if (disposed) return;
  frame = 0;
  renderer.render(scene, camera);
}
function requestRender() {
  if (!frame && !document.hidden && !disposed)
    frame = requestAnimationFrame(render);
}
function reset() {
  scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  for (const mesh of meshes) if (mesh.visible) bounds.expandByObject(mesh);
  if (bounds.isEmpty())
    bounds.setFromCenterAndSize(
      new THREE.Vector3(),
      new THREE.Vector3(2, 2, 2),
    );
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  // Fit the visible anatomy, leaving room for the side selector and touch tools.
  const usableHeight = Math.max(
    0.55,
    (stage.clientHeight - 130) / stage.clientHeight,
  );
  const usableWidth = Math.max(
    0.6,
    (stage.clientWidth - 62) / stage.clientWidth,
  );
  const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const distance =
    (Math.max(
      size.y / (2 * tangent * usableHeight),
      size.x / (2 * tangent * camera.aspect * usableWidth),
    ) +
      size.z / 2) *
    1.06;
  controls.minDistance = Math.max(0.02, Math.max(size.x, size.y, size.z) * 0.3);
  controls.maxDistance = Math.max(14, distance * 4);
  controls.target.copy(center);
  camera.position
    .copy(center)
    .add(new THREE.Vector3(0.12, 0.06, 1).normalize().multiplyScalar(distance));
  controls.update();
  requestRender();
}
controls.addEventListener("change", () => {
  if (controls.target.length() > 1.4) controls.target.clampLength(0, 1.4);
  requestRender();
});
const observer = new ResizeObserver(() => {
  const w = stage.clientWidth,
    h = stage.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  requestRender();
});
observer.observe(stage);
function info(part: Part) {
  const known = details.get(sanitize(part.name));
  return {
    meshName: part.name,
    label: known?.label ?? part.name.replace(/_/g, " "),
    english: known?.english ?? part.name.replace(/_/g, " "),
    latin: known?.latin ?? "",
    note: known?.note ?? "",
    category: part.category,
    id: known?.id ?? part.name,
  };
}
function select(part: Part | null) {
  if (selected) {
    for (const mesh of selected.meshes)
      (mesh.material as THREE.MeshStandardMaterial).emissive.set("#000000");
  }
  selected = part;
  if (part) {
    for (const mesh of part.meshes) {
      (mesh.material as THREE.MeshStandardMaterial).emissive.set("#2859a0");
      (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.38;
    }
    send("selected", { structure: info(part) });
  } else send("selected", { structure: null });
  requestRender();
}
const raycaster = new THREE.Raycaster(),
  pointer = new THREE.Vector2();
let start: { x: number; y: number } | null = null;
renderer.domElement.addEventListener("pointerdown", (event) => {
  start = { x: event.clientX, y: event.clientY };
});
renderer.domElement.addEventListener("pointerup", (event) => {
  if (
    !start ||
    Math.hypot(event.clientX - start.x, event.clientY - start.y) > 7
  )
    return;
  start = null;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    (-(event.clientY - rect.top) / rect.height) * 2 + 1,
  );
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(
    meshes.filter((m) => m.visible),
    false,
  )[0];
  select(hit ? (meshParts.get(hit.object as THREE.Mesh) ?? null) : null);
});
renderer.domElement.addEventListener("webglcontextlost", (event) => {
  event.preventDefault();
  fail("Thiết bị đã tạm dừng đồ họa 3D. Quay lại và mở mô hình lần nữa.");
});
window.somaMobileCommand = (command) => {
  if (
    command.type === "zoom" &&
    typeof command.factor === "number" &&
    command.factor >= 0.5 &&
    command.factor <= 2
  ) {
    const offset = camera.position.clone().sub(controls.target);
    offset.setLength(
      THREE.MathUtils.clamp(
        offset.length() * command.factor,
        controls.minDistance,
        controls.maxDistance,
      ),
    );
    camera.position.copy(controls.target).add(offset);
    controls.update();
    requestRender();
    return;
  }
  if (
    command.type === "side" &&
    config.model.id === "ban-tay" &&
    ["left", "right", "both"].includes(command.side ?? "")
  ) {
    handSide = command.side!;
    applyVisibility();
    select(null);
    reset();
    return;
  }
  if (command.type === "reset") {
    reset();
    return;
  }
  if (command.type === "select") {
    const name = sanitize(command.meshName ?? "");
    const part = [...parts.values()].find(
      (part) => sanitize(part.name) === name,
    );
    if (part) {
      if (
        config.model.id === "ban-tay" &&
        handSide !== "both" &&
        partSide(part) !== handSide
      ) {
        handSide = partSide(part);
        applyVisibility();
        reset();
      }
      part.meshes.forEach((mesh) => (mesh.visible = true));
      select(part);
    } else
      send("unavailable", {
        message: "Chưa có cấu trúc khớp với mô hình này.",
      });
  }
  if (command.type === "visibility") {
    if (command.category) {
      if (command.visible === false) hiddenCategories.add(command.category);
      else hiddenCategories.delete(command.category);
    }
    applyVisibility();
    requestRender();
  }
};
window.addEventListener("message", (event) => {
  if (event.source !== window.parent || event.data?.source !== "soma-app")
    return;
  window.somaMobileCommand?.(event.data.command);
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) requestRender();
});
const draco = new DRACOLoader();
draco.setDecoderPath(new URL("../runtime/", window.location.href).href);
draco.setWorkerLimit(1);
const loader = new GLTFLoader();
loader.setDRACOLoader(draco);
const abort = new AbortController(),
  timeout = setTimeout(() => abort.abort(), 30000);
async function load() {
  const response = await fetch(
    new URL(
      `../models/${encodeURIComponent(config.model.id)}/file`,
      window.location.href,
    ).href,
    { signal: abort.signal },
  );
  if (!response.ok)
    throw new Error("Không tải được mô hình. Kiểm tra kết nối và thử lại.");
  const data = await response.arrayBuffer();
  clearTimeout(timeout);
  const gltf = await loader.parseAsync(data, "");
  if (disposed) return;
  gltf.scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(gltf.scene),
    size = bounds.getSize(new THREE.Vector3()),
    center = bounds.getCenter(new THREE.Vector3());
  if (bounds.isEmpty() || Math.max(size.x, size.y, size.z) <= 0)
    throw new Error("Mô hình chưa có hình học hợp lệ.");
  gltf.scene.position.sub(center);
  group.add(gltf.scene);
  group.scale.setScalar(2.6 / Math.max(size.x, size.y, size.z));
  function originalNodeName(object: THREE.Object3D) {
    // glTF nodes may be Groups containing several primitives. Mesh/material names
    // can be shared between left/right anatomy; only node associations identify it.
    for (
      let current: THREE.Object3D | null = object;
      current && current !== gltf.scene;
      current = current.parent
    ) {
      const association = gltf.parser.associations.get(current);
      if (association?.nodes !== undefined) {
        const name = gltf.parser.json.nodes[association.nodes]?.name;
        if (typeof name === "string" && name) return name;
      }
    }
    return object.name;
  }
  gltf.scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const previous = Array.isArray(object.material)
      ? object.material
      : [object.material];
    previous.forEach((mat) => materialPool.add(mat));
    const original = originalNodeName(object);
    const category = pickCat(original),
      material = (
        category === "organ" ? organMat(original) : MAT[category]
      ).clone();
    material.side = THREE.FrontSide;
    object.material = material;
    meshes.push(object);
    const part = parts.get(original) ?? {
      name: original,
      category,
      meshes: [],
    };
    part.meshes.push(object);
    parts.set(original, part);
    meshParts.set(object, part);
    materialPool.add(material);
    geometryPool.add(object.geometry);
  });
  scene.updateMatrixWorld(true);
  if (config.model.id === "ban-tay") {
    // Source left/right nodes are far apart. Preserve each node's geometry and
    // identity, but arrange the two hands as a compact comparison in this viewer.
    const sides = (["left", "right"] as const).map((side) => {
      const display = new THREE.Group();
      scene.add(display);
      for (const part of parts.values())
        if (partSide(part) === side)
          for (const mesh of part.meshes) display.attach(mesh);
      const bounds = new THREE.Box3().setFromObject(display);
      return {
        display,
        bounds,
        center: bounds.getCenter(new THREE.Vector3()),
        width: bounds.getSize(new THREE.Vector3()).x,
      };
    });
    const [left, right] = sides;
    if (!left.bounds.isEmpty() && !right.bounds.isEmpty()) {
      const gap = Math.max(left.width, right.width) * 0.22;
      left.display.position
        .copy(left.center)
        .negate()
        .add(new THREE.Vector3(-(right.width + gap) / 2, 0, 0));
      right.display.position
        .copy(right.center)
        .negate()
        .add(new THREE.Vector3((left.width + gap) / 2, 0, 0));
      scene.updateMatrixWorld(true);
    }
  }
  applyVisibility();
  reset();
  status.hidden = true;
  send("ready", {
    structures: [...parts.values()].map(info),
    groups: CATS.filter((cat) =>
      [...parts.values()].some((part) => part.category === cat.key),
    ).map((cat) => ({
      key: cat.key,
      label: cat.label,
      count: [...parts.values()].filter((part) => part.category === cat.key)
        .length,
    })),
  });
}
void load().catch((error) => {
  clearTimeout(timeout);
  fail(error instanceof Error ? error.message : "Chưa mở được mô hình.");
});
window.addEventListener("pagehide", () => {
  disposed = true;
  abort.abort();
  clearTimeout(timeout);
  cancelAnimationFrame(frame);
  observer.disconnect();
  controls.dispose();
  draco.dispose();
  geometryPool.forEach((g) => g.dispose());
  materialPool.forEach((m) => m.dispose());
  Object.values(MAT).forEach((m) => m.dispose());
  ORGAN_ALL_SUBMATS.forEach((m) => m.dispose());
  renderer.dispose();
});
reset();
