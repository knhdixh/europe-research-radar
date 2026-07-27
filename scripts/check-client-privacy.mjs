import fs from "node:fs/promises";
import path from "node:path";
import { root } from "./lib.mjs";

const dist = path.join(root, "dist");
const files = [];
async function walk(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(target);
    else files.push(target);
  }
}
await walk(dist);
const forbidden = [
  /OPENAI_API_KEY/,
  /sk-[A-Za-z0-9_-]{20,}/,
  /api[_-]?key\s*[:=]\s*["'][^"']+/i
];
for (const file of files.filter((name) => /\.(js|css|html|json|map)$/.test(name))) {
  const content = await fs.readFile(file, "utf8");
  for (const pattern of forbidden) {
    if (pattern.test(content)) {
      console.error(`Privacy check failed: ${pattern} found in ${path.relative(root, file)}`);
      process.exit(1);
    }
  }
}
console.log(`Client privacy check passed across ${files.length} build artifacts.`);
