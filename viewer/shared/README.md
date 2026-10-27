# Standalone viewer primitives

These modules were brought into Soma Mobile from the same project's `Soma_Fe/src/lib/anatomy` and `humanAtlas` implementations on 28 October 2026. Mobile compilation and runtime must not import a sibling checkout.

- `layers.ts`: the existing material palette and anatomy classification rules. Mobile uses the bundled default catalogue; the web CMS binding is deliberately replaced with an identity function.
- `cameraFraming.ts`: fits all box corners in camera space, including asymmetric viewports.
- `modelDownload.ts`: validates file byte counts and handles both HTTP-decompressed and raw gzip model payloads.
- `anatomy.ts` and `sceneTypes.ts`: the geometry/scene contracts used by the mobile runtime. Web-only hotspot replacement metadata is opaque to the mobile viewer.
- `roomEnvironment.ts`: retains the pinned Three.js r159 room lighting implementation and its explanation. Keep its intensity and geometry when updating Three.js; changing these affects the anatomy colours.

The Three.js MIT license is preserved in `THREE-LICENSE.txt`. Dataset attribution remains in the repository root's `ATTRIBUTION.md`. Refresh these modules deliberately with regression checks; do not restore cross-repository imports or duplicate the web application and its content runtime here.
