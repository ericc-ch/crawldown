import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/main.ts"],

  format: ["esm"],
  target: "es2020",
  platform: "node",

  removeNodeProtocol: false,
  sourcemap: true,
  shims: true,
  clean: true,
})
