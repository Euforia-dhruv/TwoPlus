import { app, BrowserWindow, protocol, shell } from "electron";
import { readFile } from "node:fs/promises";
import path from "node:path";

// The renderer uses BrowserRouter, so it needs real URLs with paths, not
// file:// paths. A standard, secure scheme gives the bundle an origin that
// behaves like a website: history routing, localStorage, fetch all work.
const SCHEME = "app";
const ORIGIN = `${SCHEME}://bundle`;
const bundleRoot = path.join(app.getAppPath(), "dist");
const devURL = process.env.ELECTRON_START_URL;

protocol.registerSchemesAsPrivileged([
  {
    scheme: SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
  },
]);

// Mirrors the CSP that ships with the web build (vercel.json), which was
// verified against this exact bundle. Only applied to the packaged app, since
// dev loads from Vite's origin instead.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

async function serve(url) {
  const { pathname } = new URL(url);
  const target = path.join(bundleRoot, decodeURIComponent(pathname));
  // Anything outside dist is a traversal attempt, not a request.
  if (!target.startsWith(bundleRoot + path.sep) && target !== bundleRoot) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const body = await readFile(target);
    const headers = { "content-type": MIME[path.extname(target)] ?? "application/octet-stream" };
    if (headers["content-type"].startsWith("text/html")) headers["content-security-policy"] = CSP;
    return new Response(body, { headers });
  } catch {
    // A path with no file behind it is a client route (/app/overview/...).
    if (path.extname(target)) return new Response("Not found", { status: 404 });
    const html = await readFile(path.join(bundleRoot, "index.html"));
    return new Response(html, {
      headers: { "content-type": MIME[".html"], "content-security-policy": CSP },
    });
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#edf0ef",
    autoHideMenuBar: true,
    show: false,
    title: "TwoPlus",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once("ready-to-show", () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) shell.openExternal(url);
    return { action: "deny" };
  });
  // Keep the shell pointed at the app; real links belong in the browser.
  win.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith(ORIGIN) || (devURL && url.startsWith(devURL))) return;
    event.preventDefault();
    if (url.startsWith("https://")) shell.openExternal(url);
  });
  // Renderer errors reach the terminal, so a support call has something to read.
  win.webContents.on("console-message", ({ level, message }) => {
    if (level === "error") console.log(`[renderer] ${message}`);
  });

  win.loadURL(devURL ?? `${ORIGIN}/`);

  if (process.argv.includes("--smoke-check")) {
    win.webContents.once("did-finish-load", async () => {
      const probe = `JSON.stringify({
        url: location.href,
        mounted: (document.querySelector("#root")?.childElementCount ?? 0) > 0,
        heading: document.querySelector("h1")?.textContent?.trim() ?? "",
      })`;
      const root = JSON.parse(await win.webContents.executeJavaScript(probe));
      // A deep link is the whole reason this shell serves a custom scheme: it
      // must reach the router, not a 404 from the file handler.
      await win.loadURL(`${ORIGIN}/app/overview/overview`);
      const deep = JSON.parse(await win.webContents.executeJavaScript(probe));
      const ok = root.mounted && deep.mounted && deep.url.endsWith("/app/overview/overview");
      console.log(`SMOKE ${JSON.stringify({ root, deep, ok })}`);
      app.exit(ok ? 0 : 1);
    });
  }

  return win;
}

// One workspace per machine; a second launch focuses the open window instead.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    protocol.handle(SCHEME, ({ url }) => serve(url));
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
