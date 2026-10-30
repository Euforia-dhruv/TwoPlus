// Theme leakage probe: any colour literal in a TSX file is a style decision
// that no design language can override. Inline styles are reported separately
// because they outrank every stylesheet rule.
const fs = require("fs");
const path = require("path");

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(tsx|ts)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const COLOR = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/;
const INLINE = /style=\{\{/;

for (const file of walk("src")) {
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split("\n");
  const colors = [];
  const inline = [];
  lines.forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, "");
    if (INLINE.test(code)) inline.push(i + 1);
    // Skip import paths and CSS-var fallbacks inside var().
    if (!COLOR.test(code)) return;
    if (/^\s*(import|from)\s/.test(code)) return;
    if (/var\(--[a-z-]+,\s*[^)]*\)/.test(code)) return;
    colors.push({ line: i + 1, text: code.trim().slice(0, 110) });
  });
  if (!colors.length && !inline.length) continue;
  const rel = file.replace(/\\/g, "/");
  console.log(`\n${rel}  colors=${colors.length} inline=${inline.length}`);
  for (const c of colors.slice(0, 12)) console.log(`  ${c.line}: ${c.text}`);
  if (colors.length > 12) console.log(`  ... ${colors.length - 12} more`);
  if (inline.length) console.log(`  inline-style lines: ${inline.join(", ")}`);
}
