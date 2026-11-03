import type { CapacitorConfig } from "@capacitor/cli";

// The native shells load the built web app from `dist`. Nothing is duplicated:
// the Android and iOS projects are wrappers around the same bundle the browser
// gets, which is why one codebase ships to all three surfaces.
//
// `server.url` is deliberately absent. Pointing the shell at a dev machine is a
// local-only convenience, and committing it would make a release build load code
// from someone's laptop.
const config: CapacitorConfig = {
  appId: "fit.twoplus.app",
  appName: "TwoPlus",
  webDir: "dist",
  // The web app talks to Supabase over HTTPS only; cleartext traffic is not
  // needed and stays off.
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: "always",
  },
};

export default config;
