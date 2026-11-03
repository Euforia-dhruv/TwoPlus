// Renders public/favicon.svg into a multi-size Windows .ico for the desktop
// build. Uses the Chromium that Playwright already installed, so it adds no
// dependency; run it whenever the mark changes.
import { chromium } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const SIZES = [16, 24, 32, 48, 64, 128, 256];
const svg = await readFile("public/favicon.svg", "utf8");
const dataURL = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 256, height: 256 } });
await page.setContent(
  `<style>html,body{margin:0;background:transparent}img{display:block;width:256px;height:256px}</style>
   <img id="mark" src="${dataURL}" alt="">`,
);
await page.waitForSelector("#mark");

// One master render, then canvas downscales so every size is crisp.
const pngs = await page.evaluate(async (sizes) => {
  const img = document.getElementById("mark");
  await img.decode();
  return Promise.all(
    sizes.map((size) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, size, size);
      return canvas.toDataURL("image/png").split(",")[1];
    }),
  );
}, SIZES);
await browser.close();

const images = pngs.map((b64) => Buffer.from(b64, "base64"));

// ICO container: a directory of PNG entries, which Windows Vista and later read
// directly, so no BMP encoding is needed.
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(images.length, 4);

let offset = 6 + images.length * 16;
const entries = images.map((buf, i) => {
  const size = SIZES[i];
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0); // 0 encodes 256
  entry.writeUInt8(size >= 256 ? 0 : size, 1);
  entry.writeUInt8(0, 2); // palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(buf.length, 8);
  entry.writeUInt32LE(offset, 12);
  offset += buf.length;
  return entry;
});

await mkdir("build", { recursive: true });
const ico = Buffer.concat([header, ...entries, ...images]);
await writeFile(path.join("build", "icon.ico"), ico);
console.log(`build/icon.ico  ${SIZES.join(", ")}px  ${(ico.length / 1024).toFixed(1)} KB`);
