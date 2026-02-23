import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "screenshots.spec.ts",
  timeout: 900_000,
  use: {
    baseURL: "http://localhost:3000",
    browserName: "chromium",
    headless: false, // Mettre à true pour exécuter sans fenêtre visible
    screenshot: "off",
    video: "off",
  },
  projects: [
    {
      name: "screenshots",
      use: {
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
});
