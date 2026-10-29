import * as THREE from "three";

/** Translate intact structures outwards; never flatten depth or resize anatomy. */
export function anatomicalOffsets(items: { id: string; bounds: THREE.Box3 }[]) {
  const bounds = new THREE.Box3();
  items.forEach((item) => bounds.union(item.bounds));
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const span = Math.max(size.x, size.y, size.z, 0.001);
  return new Map(
    items.map(({ id, bounds: box }) => {
      const offset = box.getCenter(new THREE.Vector3()).sub(center);
      // Anatomical height remains legible; depth remains available when orbiting.
      offset.multiply(new THREE.Vector3(1.8, 0.65, 1.8));
      if (offset.length() < span * 0.025) {
        let hash = 0;
        for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
        const angle = ((hash % 360) * Math.PI) / 180;
        offset.add(
          new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).multiplyScalar(
            span * 0.12,
          ),
        );
      }
      return [id, offset] as const;
    }),
  );
}
