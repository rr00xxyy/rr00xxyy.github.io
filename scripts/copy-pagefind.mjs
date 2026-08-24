import fs from "node:fs";
import path from "node:path";

const source = path.resolve("dist", "pagefind");
const destination = path.resolve("public", "pagefind");

if (!fs.existsSync(source)) {
  throw new Error(`Pagefind output does not exist: ${source}`);
}

fs.cpSync(source, destination, { recursive: true, force: true });
console.log(`Copied Pagefind assets to ${destination}`);
