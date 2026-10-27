const fs = require("node:fs");
const path = require("node:path");
const { PNG } = require("pngjs");
const root = path.resolve(__dirname, "..");
const models = require("../assets/offline/catalogue.json").models;
const scales = {};
for (const { id } of models) {
  const png = PNG.sync.read(
    fs.readFileSync(path.join(root, "assets/offline/thumbnails", id + ".png")),
  );
  let x0 = png.width,
    x1 = 0,
    y0 = png.height,
    y1 = 0;
  for (let y = 0; y < png.height; y++)
    for (let x = 0; x < png.width; x++) {
      if (png.data[(y * png.width + x) * 4 + 3] > 20) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
    }
  if (x1 <= x0 || y1 <= y0) throw Error("Empty thumbnail: " + id);
  scales[id] =
    Math.round(
      Math.min(
        1.8,
        0.88 / Math.max((x1 - x0) / png.width, (y1 - y0) / png.height),
      ) * 100,
    ) / 100;
}
fs.writeFileSync(
  path.join(root, "src/ui/artScale.ts"),
  "// Generated display framing from transparent model renders.\nexport const ART_SCALE: Record<string, number> = " +
    JSON.stringify(scales) +
    ";\n",
);
console.log("Framed " + models.length + " model thumbnails");
