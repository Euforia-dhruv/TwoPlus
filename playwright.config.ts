import { defineConfig, devices } from "@playwright/test";

// One dev server, one signed-in storage state, then every gate runs against the
// real app. Set AUDIT_URL to point the suite at a deployed build instead.
const baseURL = process.env.AUDIT_URL || "http://localhost:5173";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // The owner journey writes real rows through six UI steps and needs ~30 s on a
  // cold dev server, which is Playwright's default budget exactly. Give the whole
  // suite room instead of tuning one spec that is already near the line.
  timeout: 120_000,
  reporter: [["list"]],
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    // Signs in once and saves the session for every other spec.
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "app",
      testMatch: /.*\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/.auth/state.json",
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
