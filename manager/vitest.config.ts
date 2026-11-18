import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    // Testes de integração compartilham um Postgres só: rodar em paralelo
    // faria um teste truncar as tabelas embaixo do outro.
    fileParallelism: false,
    testTimeout: 20_000,
  },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
