// Writes SHA256SUMS over the build output, so a download can be checked against
// what CI produced. Deliberately plain Node: no dependency, and it runs the same
// on a Windows dev box as on a runner.
//
// usage: node scripts/checksums.mjs [dirOrFile ...]   (default: dist release)

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const roots = process.argv.slice(2);
const targets = roots.length ? roots : ["dist", "release"];

function walk(path) {
  const stat = statSync(path, { throwIfNoEntry: false });
  if (!stat) return [];
  if (stat.isFile()) return [path];
  return readdirSync(path)
    .sort()
    .flatMap((name) => walk(join(path, name)));
}

const files = targets.flatMap(walk);
if (!files.length) {
  console.error(`Nothing to hash. Looked in: ${targets.join(", ")}`);
  process.exit(1);
}

const lines = files.map((file) => {
  const hash = createHash("sha256").update(readFileSync(file)).digest("hex");
  return `${hash}  ${relative(process.cwd(), file).replaceAll("\\", "/")}`;
});

writeFileSync("SHA256SUMS", `${lines.join("\n")}\n`);
console.log(`SHA256SUMS: ${lines.length} file(s)`);
for (const line of lines) console.log(line);
