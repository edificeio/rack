import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    watch: false,
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    setupFiles: ["./src/mocks/setup.ts"],
    reporters: ["default"],
    coverage: {
      reportsDirectory: "./coverage/demo",
      provider: "v8",
    },
    server: {
      deps: {
        inline: ["@edifice.io/react"],
      },
    },
  },
});
