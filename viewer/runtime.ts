import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  CATS,
  MAT,
  ORGAN_ALL_SUBMATS,
} from "../../Soma_Fe/src/lib/anatomy/layers";
import { anatomicalOffsets } from "./explosion";
import { frameAnatomyBox } from "../../Soma_Fe/src/lib/humanAtlas/cameraFraming";
import { RoomEnvironment } from "../../Soma_Fe/src/lib/humanAtlas/roomEnvironment";
import { loadAtlas, loadGlb, type LoadedPart } from "./loaders";
import type {
  ViewerCommand,
  ViewerGroup,
  ViewerState,
  ViewerStructure,
} from "../src/components/Viewer.types";
import "./contracts";

const config = window.SOMA_VIEWER_CONFIG;
const preview =
  config.preview ?? new URLSearchParams(location.search).get("preview") === "1";
const background = preview ? "#18232e" : config.dark ? "#191c1b" : "#f2f4f3";
const stage = document.getElementById("stage")!,
  status = document.getElementById("status")!;
const labels = document.createElement("div");
labels.id = "labels";
stage.appendChild(labels);
document.body.style.background = config.transparent
  ? "transparent"
  : background;
if (config.dark || preview) {
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
  fail("Trình xem 3D chưa khởi động được. Hãy mở lại mô hình."),
);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: config.transparent === true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.localClippingEnabled = true;
renderer.setClearColor(background, config.transparent ? 0 : 1);
stage.prepend(renderer.domElement);
const scene = new THREE.Scene(),
  camera = new THREE.PerspectiveCamera(34, 1, 0.005, 100);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.085;
controls.zoomSpeed = 0.65;
controls.screenSpacePanning = true;
const pmrem = new THREE.PMREMGenerator(renderer);
const room = new RoomEnvironment();
const environment = pmrem.fromScene(room, 0.04);
scene.environment = environment.texture;
room.dispose();
pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xffffff, 0xa7acb2, 1.05));
const light = new THREE.DirectionalLight(0xfffaf4, 2.3);
light.position.set(-2, 4, 3);
scene.add(light);
const fill = new THREE.DirectionalLight(0xe9f0ff, 1.8);
fill.position.set(2, 2, -3);
scene.add(fill);
const group = new THREE.Group();
scene.add(group);
const parts: LoadedPart[] = [],
  meshes: THREE.Mesh[] = [];
const meshParts = new WeakMap<THREE.Mesh, LoadedPart>();
const basePositions = new Map<string, THREE.Vector3>(),
  baseBounds = new Map<string, THREE.Box3>();
const hiddenParts = new Set<string>(),
  fadedParts = new Set<string>(),
  hiddenCategories = new Set<string>();
const assembledBounds = new THREE.Box3();
let layerDefinitions: ViewerGroup[] = [],
  selectedIds = new Set<string>();
let isolatedIds = new Set<string>();
let availableSides: ("left" | "right" | "both")[] = [];
let frame = 0,
  rendered = 0,
  disposed = false,
  ready = false,
  explode = 0,
  explodeScope: "all" | "selected" = "all",
  isolate = false,
  showLabels = false;
let view = config.scene?.view ?? "three-quarter",
  handSide: "left" | "right" | "both" =
    config.model.id === "ban-tay" ? "right" : "both";
let clip = {
  enabled: !!config.scene?.clip,
  axis: config.scene?.clip?.axis ?? ("y" as "x" | "y" | "z"),
  percent: config.scene?.clip?.percent ?? 50,
  keepPositive: config.scene?.clip?.keepPositive ?? false,
};
let previewVisible = true;
let previewSpin =
  preview && !matchMedia("(prefers-reduced-motion: reduce)").matches;
let lastRenderTime = performance.now();
controls.autoRotateSpeed = 0.65;
const sanitize = (name: string) => THREE.PropertyBinding.sanitizeNodeName(name);
function partSide(part: LoadedPart) {
  const name = part.info.english || part.info.meshName;
  return /\bleft\b|[._]l$/i.test(name)
    ? "left"
    : /\bright\b|[._]r$/i.test(name)
      ? "right"
      : "both";
}
function state(): ViewerState {
  return {
    side: handSide,
    availableSides,
    explode,
    explodeScope,
    isolate,
    hiddenCategories: [...hiddenCategories],
    hiddenCount: hiddenParts.size,
    selectedHidden: [...selectedIds].some((id) => hiddenParts.has(id)),
    selectedFaded:
      selectedIds.size > 0 &&
      [...selectedIds].every((id) => fadedParts.has(id)),
    showLabels,
    view,
    clip: { ...clip },
  };
}
function emitState() {
  send("state", { state: state() });
}
function drawLabels() {
  labels.replaceChildren();
  if (!showLabels || !ready) return;
  const visible = parts.filter((part) => part.root.visible);
  const candidates = [
    ...visible.filter((part) => selectedIds.has(part.info.meshName)),
    ...visible.filter((part) => !selectedIds.has(part.info.meshName)),
  ].slice(0, 12);
  const occupied: { x: number; y: number }[] = [];
  for (const part of candidates) {
    const point = new THREE.Box3()
      .setFromObject(part.root)
      .getCenter(new THREE.Vector3())
      .project(camera);
    if (
      point.z < -1 ||
      point.z > 1 ||
      Math.abs(point.x) > 1 ||
      Math.abs(point.y) > 1
    )
      continue;
    const x = ((point.x + 1) / 2) * stage.clientWidth;
    const y = ((1 - point.y) / 2) * stage.clientHeight;
    if (occupied.some((p) => Math.abs(p.x - x) < 125 && Math.abs(p.y - y) < 30))
      continue;
    occupied.push({ x, y });
    const button = document.createElement("button");
    button.textContent =
      config.locale === "en"
        ? part.info.english || part.info.label
        : part.info.label;
    button.title = part.info.label;
    button.setAttribute("aria-label", part.info.label);
    button.style.left = `${((point.x + 1) / 2) * stage.clientWidth}px`;
    button.style.top = `${((1 - point.y) / 2) * stage.clientHeight}px`;
    button.onclick = () => select(part.info);
    labels.appendChild(button);
  }
}
function render() {
  frame = 0;
  if (disposed) return;
  const now = performance.now();
  controls.autoRotate = previewSpin && previewVisible && !document.hidden;
  if (ready) controls.update(Math.min((now - lastRenderTime) / 1000, 0.05));
  lastRenderTime = now;
  renderer.render(scene, camera);
  rendered++;
  drawLabels();
  if (ready && controls.autoRotate) requestRender();
}
function requestRender() {
  if (!frame && !document.hidden && !disposed)
    frame = requestAnimationFrame(render);
}
function retainedBounds(part: LoadedPart) {
  const bounds = baseBounds.get(part.info.meshName)!.clone();
  if (clip.enabled) {
    const cut = THREE.MathUtils.lerp(
      assembledBounds.min[clip.axis],
      assembledBounds.max[clip.axis],
      clip.percent / 100,
    );
    if (clip.keepPositive)
      bounds.min[clip.axis] = Math.max(bounds.min[clip.axis], cut);
    else bounds.max[clip.axis] = Math.min(bounds.max[clip.axis], cut);
  }
  return bounds;
}
function fit(preserveDirection = false) {
  scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  const frameIds = new Set(
    config.scene?.groups
      ?.filter((item) => config.scene.frameGroups?.includes(item.key))
      .flatMap((item) => item.parts),
  );
  const framed = explode === 0 && !isolate && frameIds.size > 0;
  for (const part of parts)
    if (part.root.visible && (!framed || frameIds.has(part.info.meshName)))
      bounds.union(
        retainedBounds(part).translate(
          part.root.position
            .clone()
            .sub(basePositions.get(part.info.meshName)!)
            .multiplyScalar(group.scale.x),
        ),
      );
  if (bounds.isEmpty())
    for (const part of parts)
      if (part.root.visible) bounds.union(retainedBounds(part));
  if (bounds.isEmpty())
    bounds.setFromCenterAndSize(
      new THREE.Vector3(),
      new THREE.Vector3(2, 2, 2),
    );
  const directions: Record<string, number[]> = {
    front: [0, 0.05, 1],
    back: [-0.2, 0.1, -1],
    side: [1, 0.1, 0.15],
    "three-quarter": [0.2, 0.1, 1],
    top: [0, 1, -0.35],
    bottom: [0, -1, -0.35],
  };
  // Fit the retained geometry in camera space, including top/bottom views.
  // A whole-body bounding sphere made thin sections unnecessarily tiny.
  controls.enableDamping = false;
  controls.update();
  const width = stage.clientWidth,
    height = stage.clientHeight;
  const fitted = frameAnatomyBox(
    camera,
    bounds,
    preserveDirection
      ? camera.position.clone().sub(controls.target).normalize()
      : new THREE.Vector3().fromArray(directions[view] ?? directions.front),
    width,
    height,
    {
      left: 12,
      right: width - 12,
      top: 16,
      bottom: height - (preview ? 16 : 54),
    },
  );
  controls.minDistance = Math.max(camera.near * 2, fitted.distance * 0.05);
  controls.maxDistance = Math.max(14, fitted.distance * 6);
  controls.target.copy(fitted.center);
  controls.update();
  controls.enableDamping = true;
  requestRender();
}
function apply() {
  for (const part of parts) {
    const side = partSide(part);
    const sideVisible =
      config.model.id !== "ban-tay" ||
      handSide === "both" ||
      side === "both" ||
      side === handSide;
    const layerVisible =
      !part.categories.length ||
      part.categories.some((key) => !hiddenCategories.has(key));
    part.root.visible =
      sideVisible &&
      layerVisible &&
      !hiddenParts.has(part.info.meshName) &&
      (!isolate || isolatedIds.has(part.info.meshName)) &&
      !retainedBounds(part).isEmpty();
    part.root.position.copy(basePositions.get(part.info.meshName)!);
  }
  if (explode > 0) {
    const visible = parts.filter((part) => part.root.visible);
    const layout = anatomicalOffsets(
      visible.map((part) => ({
        id: part.info.meshName,
        bounds: retainedBounds(part),
      })),
    );
    for (const part of visible) {
      if (explodeScope === "selected" && !selectedIds.has(part.info.meshName))
        continue;
      part.root.position.add(
        layout
          .get(part.info.meshName)!
          .clone()
          .multiplyScalar(explode / group.scale.x),
      );
    }
  }
  scene.updateMatrixWorld(true);
  for (const part of parts)
    for (const mesh of part.meshes) {
      const material = mesh.material as THREE.MeshStandardMaterial;
      // Cut-away surfaces must remain visible from inside; intact meshes keep front-face culling.
      material.side = clip.enabled ? THREE.DoubleSide : THREE.FrontSide;
      const faded = fadedParts.has(part.info.meshName);
      material.transparent = faded;
      material.opacity = faded ? 0.18 : 1;
      material.depthWrite = !faded;
      material.emissive.set(
        selectedIds.has(part.info.meshName) ? "#2859a0" : "#000000",
      );
      material.emissiveIntensity = 0.38;
      if (clip.enabled) {
        const axis = clip.axis,
          normal = new THREE.Vector3();
        normal[axis] = clip.keepPositive ? 1 : -1;
        const point = assembledBounds.getCenter(new THREE.Vector3());
        point[axis] = THREE.MathUtils.lerp(
          assembledBounds.min[axis],
          assembledBounds.max[axis],
          clip.percent / 100,
        );
        // Move the clipping plane with its structure to retain the original cut while separated.
        point.add(
          part.root.position
            .clone()
            .sub(basePositions.get(part.info.meshName)!)
            .multiplyScalar(group.scale.x),
        );
        material.clippingPlanes = [
          new THREE.Plane().setFromNormalAndCoplanarPoint(normal, point),
        ];
      } else material.clippingPlanes = [];
      material.needsUpdate = true;
    }
  requestRender();
}
function select(info: ViewerStructure | null) {
  selectedIds = new Set(
    info?.meshNames?.length ? info.meshNames : info ? [info.meshName] : [],
  );
  send("selected", { structure: info });
  apply();
  emitState();
}
controls.addEventListener("change", requestRender);
controls.addEventListener("start", () => {
  previewSpin = false;
  controls.autoRotate = false;
});
const visibilityObserver = preview
  ? new IntersectionObserver(([entry]) => {
      previewVisible = entry.isIntersecting;
      requestRender();
    })
  : null;
visibilityObserver?.observe(stage);
const observer = new ResizeObserver(() => {
  const width = stage.clientWidth,
    height = stage.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  if (ready) {
    apply();
    fit();
  } else requestRender();
});
observer.observe(stage);
const raycaster = new THREE.Raycaster(),
  pointer = new THREE.Vector2();
let start: { x: number; y: number; id: number } | null = null,
  multiTouch = false;
const touches = new Set<number>();
renderer.domElement.addEventListener("pointerdown", (event) => {
  touches.add(event.pointerId);
  multiTouch = touches.size > 1;
  start = multiTouch
    ? null
    : { x: event.clientX, y: event.clientY, id: event.pointerId };
});
renderer.domElement.addEventListener("pointercancel", (event) => {
  touches.delete(event.pointerId);
  start = null;
});
renderer.domElement.addEventListener("pointerup", (event) => {
  touches.delete(event.pointerId);
  const tap = start;
  start = null;
  if (
    multiTouch ||
    !tap ||
    tap.id !== event.pointerId ||
    Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 7
  )
    return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    (-(event.clientY - rect.top) / rect.height) * 2 + 1,
  );
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster
    .intersectObjects(
      meshes.filter((mesh) => meshParts.get(mesh)?.root.visible),
      false,
    )
    .find(
      (item) =>
        (
          (item.object as THREE.Mesh).material as THREE.MeshStandardMaterial
        ).clippingPlanes?.every(
          (plane) => plane.distanceToPoint(item.point) >= 0,
        ) ?? true,
    );
  select(hit ? meshParts.get(hit.object as THREE.Mesh)!.info : null);
});
renderer.domElement.addEventListener("webglcontextlost", (event) => {
  event.preventDefault();
  if (disposed) return;
  fail("Thiết bị đã tạm dừng đồ họa 3D. Quay lại và mở mô hình lần nữa.");
});

window.somaMobileCommand = (command: ViewerCommand) => {
  if (command.type === "appearance") {
    config.dark = command.dark === true;
    config.locale = command.locale ?? "vi";
    const color = config.dark ? "#191c1b" : "#f2f4f3";
    document.body.style.background = color;
    document.body.style.color = config.dark ? "#edf1f7" : "#17202e";
    renderer.setClearColor(color, config.transparent ? 0 : 1);
    requestRender();
    return;
  }

  if (!ready) return;
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
  if (command.type === "reset") {
    fit();
    return;
  }
  if (command.type === "select") {
    const name = sanitize(command.meshName ?? "");
    const info = structures().find((item) => sanitize(item.meshName) === name);
    if (!info) {
      send("unavailable", {
        message: "Chưa có cấu trúc khớp với mô hình này.",
      });
      return;
    }
    const ids = info.meshNames ?? [info.meshName];
    for (const part of parts.filter((part) =>
      ids.includes(part.info.meshName),
    )) {
      hiddenParts.delete(part.info.meshName);
      part.categories.forEach((key) => hiddenCategories.delete(key));
    }
    if (config.model.id === "ban-tay" && handSide !== "both") {
      const sides = new Set(
        parts.filter((part) => ids.includes(part.info.meshName)).map(partSide),
      );
      handSide =
        sides.has("left") && sides.has("right")
          ? "both"
          : sides.has("left")
            ? "left"
            : sides.has("right")
              ? "right"
              : handSide;
    }
    if (isolate && !ids.some((id) => isolatedIds.has(id)))
      isolatedIds = new Set(ids);
    select(info);
    if (isolate) fit();
    return;
  }
  if (
    command.type === "side" &&
    config.model.id === "ban-tay" &&
    availableSides.includes(command.side!)
  )
    handSide = command.side!;
  else if (command.type === "explode" && Number.isFinite(command.amount)) {
    explode = THREE.MathUtils.clamp(command.amount!, 0, 1);
    if (command.scope === "all" || command.scope === "selected")
      explodeScope = command.scope;
  } else if (
    command.type === "visibility" &&
    layerDefinitions.some((layer) => layer.key === command.category)
  ) {
    if (command.visible === false) hiddenCategories.add(command.category!);
    else hiddenCategories.delete(command.category!);
  } else if (
    command.type === "isolate" &&
    (selectedIds.size || command.enabled === false)
  ) {
    isolate = command.enabled ?? !isolate;
    isolatedIds = isolate ? new Set(selectedIds) : new Set();
  } else if (command.type === "hide" || command.type === "fade") {
    const set = command.type === "hide" ? hiddenParts : fadedParts;
    const enabled =
      command.enabled ?? ![...selectedIds].every((id) => set.has(id));
    selectedIds.forEach((id) => {
      if (enabled) set.add(id);
      else set.delete(id);
    });
  } else if (command.type === "labels")
    showLabels = command.enabled ?? !showLabels;
  else if (
    command.type === "view" &&
    ["front", "back", "side", "three-quarter", "top", "bottom"].includes(
      command.view ?? "",
    )
  )
    view = command.view!;
  else if (command.type === "clip") {
    clip = {
      enabled: command.enabled ?? clip.enabled,
      axis: ["x", "y", "z"].includes(command.axis ?? "")
        ? command.axis!
        : clip.axis,
      percent: Number.isFinite(command.percent)
        ? THREE.MathUtils.clamp(command.percent!, 0, 100)
        : clip.percent,
      keepPositive: command.keepPositive ?? clip.keepPositive,
    };
  } else if (command.type === "restore") {
    hiddenParts.clear();
    fadedParts.clear();
    hiddenCategories.clear();
    isolatedIds.clear();
    isolate = false;
    explode = 0;
    explodeScope = "all";
    clip.enabled = false;
    view = "three-quarter";
    selectedIds.clear();
    send("selected", { structure: null });
  }
  apply();
  fit(command.type !== "view" && command.type !== "restore");
  emitState();
};
window.addEventListener("message", (event) => {
  if (event.source !== window.parent || event.data?.source !== "soma-app")
    return;
  window.somaMobileCommand?.(event.data.command);
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) requestRender();
});
function structures(): ViewerStructure[] {
  const groups =
    config.model.kind === "atlas"
      ? config.model.structures.map((item) => ({
          ...item,
          category: item.meshName,
          kind: "group" as const,
        }))
      : [];
  return [...groups, ...parts.map((part) => part.info)];
}
const abort = new AbortController(),
  timeout = setTimeout(() => {
    abort.abort();
    fail("Mô hình tải quá lâu. Hãy thử lại hoặc mở bản có sẵn trên thiết bị.");
  }, 30000);
async function load() {
  const loaded =
    config.model.kind === "atlas"
      ? await loadAtlas(config, abort.signal, (text) => {
          status.textContent = text;
        })
      : await loadGlb(config, abort.signal);
  if (disposed) {
    loaded.forEach(disposePart);
    return;
  }
  if (!loaded.length) throw Error("Mô hình chưa có hình học hợp lệ.");
  parts.push(...loaded);
  if (config.model.id === "ban-tay") {
    const sides = new Set(
      parts.map(partSide).filter((side) => side !== "both"),
    );
    availableSides = [...sides];
    if (sides.size > 1) availableSides.push("both");
    if (!availableSides.includes(handSide))
      handSide = availableSides[0] ?? "both";
  }
  for (const part of parts) {
    group.add(part.root);
    for (const mesh of part.meshes) {
      meshes.push(mesh);
      meshParts.set(mesh, part);
    }
  }
  scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(group),
    size = bounds.getSize(new THREE.Vector3()),
    center = bounds.getCenter(new THREE.Vector3());
  if (bounds.isEmpty() || size.length() <= 0)
    throw Error("Mô hình chưa có hình học hợp lệ.");
  group.scale.setScalar(2.6 / Math.max(size.x, size.y, size.z));
  group.position.copy(center).multiplyScalar(-group.scale.x);
  scene.updateMatrixWorld(true);
  for (const part of parts) {
    basePositions.set(part.info.meshName, part.root.position.clone());
    baseBounds.set(
      part.info.meshName,
      new THREE.Box3().setFromObject(part.root),
    );
  }
  assembledBounds.setFromObject(group);
  if (config.model.kind === "atlas") {
    layerDefinitions = config.scene.layers?.length
      ? config.scene.layers.map((layer) => ({
          key: layer.key,
          label: layer.name.vi,
          visible: !!layer.on,
          count: parts.filter((part) => part.categories.includes(layer.key))
            .length,
        }))
      : config.scene.groups.map((item) => ({
          key: item.key,
          label: item.name.vi,
          count: item.parts.length,
          visible: true,
        }));
    layerDefinitions
      .filter((layer) => !layer.visible)
      .forEach((layer) => hiddenCategories.add(layer.key));
    config.scene.groups
      .filter((item) => config.scene.fadedGroups?.includes(item.key))
      .flatMap((item) => item.parts)
      .forEach((id) => fadedParts.add(id));
  } else
    layerDefinitions = CATS.filter((cat) =>
      parts.some((part) => part.info.category === cat.key),
    ).map((cat) => ({
      key: cat.key,
      label: cat.label,
      count: parts.filter((part) => part.info.category === cat.key).length,
      visible: true,
    }));
  ready = true;
  clearTimeout(timeout);
  apply();
  fit();
  status.hidden = true;
  send("ready", {
    structures: structures(),
    groups: layerDefinitions,
    state: state(),
  });
}
function disposePart(part: LoadedPart) {
  for (const mesh of part.meshes) {
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  }
}
window.somaMobileDebug = () => ({
  state: state(),
  rendered,
  camera: {
    position: camera.position.toArray(),
    target: controls.target.toArray(),
    quaternion: camera.quaternion.toArray(),
  },
  quality: {
    pixelRatio: renderer.getPixelRatio(),
    antialias: renderer.getContext().getContextAttributes()?.antialias ?? false,
  },
  preview,
  autoRotate: controls.autoRotate,
  parts: parts.map((part) => ({
    id: part.info.meshName,
    visible: part.root.visible,
    position: part.root.position.toArray(),
    bounds: [
      baseBounds.get(part.info.meshName)!.min.toArray(),
      baseBounds.get(part.info.meshName)!.max.toArray(),
    ],
  })),
});
void load().catch((error) => {
  clearTimeout(timeout);
  if (!disposed)
    fail(error instanceof Error ? error.message : "Chưa mở được mô hình.");
});
window.addEventListener("pagehide", () => {
  disposed = true;
  abort.abort();
  clearTimeout(timeout);
  cancelAnimationFrame(frame);
  observer.disconnect();
  visibilityObserver?.disconnect();
  controls.dispose();
  parts.forEach(disposePart);
  Object.values(MAT).forEach((material) => material.dispose());
  ORGAN_ALL_SUBMATS.forEach((material) => material.dispose());
  environment.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
});
