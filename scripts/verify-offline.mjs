import { join } from "node:path";
import { appRoot } from "./lib/desktop.mjs";
import { verifyOfflineCatalogue } from "./lib/offline-catalogue.mjs";

const result = verifyOfflineCatalogue(join(appRoot, "assets/offline"));
console.log(
  `PASS: ${result.models} offline scenes, ${result.buffers} buffer checksums and local artwork`,
);
