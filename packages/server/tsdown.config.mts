import { defineConfig } from "tsdown";

// Unbundled, so dist mirrors src: the migrations are loaded from a folder at run time.
export default defineConfig({
  entry: ["src/**/*.ts"],
  unbundle: true,
  platform: "node",
  format: "esm",
  fixedExtension: false,
  clean: true,
  dts: false,
});
