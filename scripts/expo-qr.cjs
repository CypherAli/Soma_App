const { toQR } = require("toqr");
const { PNG } = require("pngjs");
const fs = require("node:fs");
const path = require("node:path");
function writeExpoQR(url, output) {
  const data = toQR(url),
    size = Math.sqrt(data.length),
    margin = 4,
    scale = 10;
  if (!Number.isInteger(size)) throw Error("Invalid QR matrix");
  const png = new PNG({
    width: (size + margin * 2) * scale,
    height: (size + margin * 2) * scale,
  });
  png.data.fill(255);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if (data[y * size + x]) {
        for (let dy = 0; dy < scale; dy++)
          for (let dx = 0; dx < scale; dx++) {
            const offset =
              (((y + margin) * scale + dy) * png.width +
                (x + margin) * scale +
                dx) *
              4;
            png.data[offset] = png.data[offset + 1] = png.data[offset + 2] = 0;
          }
      }
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, PNG.sync.write(png));
  return output;
}
function printExpoQR(url) {
  const data = toQR(url),
    size = Math.sqrt(data.length),
    margin = 4,
    extent = size + margin * 2;
  const dark = (x, y) =>
    x >= margin &&
    y >= margin &&
    x < size + margin &&
    y < size + margin &&
    data[(y - margin) * size + x - margin] === 1;
  for (let y = 0; y < extent; y += 2) {
    let line = "";
    for (let x = 0; x < extent; x++) {
      const top = dark(x, y),
        bottom = dark(x, y + 1);
      line += top ? (bottom ? "█" : "▀") : bottom ? "▄" : " ";
    }
    process.stdout.write("\x1b[30;47m" + line + "\x1b[0m\n");
  }
}
module.exports = { writeExpoQR, printExpoQR };
if (require.main === module)
  console.log(writeExpoQR(process.argv[2], path.resolve(process.argv[3])));
