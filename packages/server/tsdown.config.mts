import { existsSync, globSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";

import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    main: "src/main.ts",
    runMigrations: "src/runMigrations.ts",
    ...Object.fromEntries(globSync("src/migrations/*.ts").map((file) => [`migrations/${basename(file, ".ts")}`, file])),
  },

  deps: {
    alwaysBundle: [/.*/],
    onlyBundle: false,
    onlyImport: [],
  },

  platform: "node",
  target: "node26",
  format: "esm",
  fixedExtension: false,

  minify: true,
  shims: true,
  sourcemap: true,

  outputOptions: {
    keepNames: true,
    sourcemapExcludeSources: true,
  },

  plugins: [
    {
      name: "third-party-notices",
      generateBundle() {
        const packages = new Map<string, string>();

        for (const id of this.getModuleIds()) {
          if (!id.includes("/node_modules/") || id.includes("\0")) continue;

          let directory = dirname(id);
          while (!existsSync(join(directory, "package.json")) && dirname(directory) !== directory) {
            directory = dirname(directory);
          }

          const manifest = join(directory, "package.json");
          if (!existsSync(manifest)) continue;

          const { name, version, license } = JSON.parse(readFileSync(manifest, "utf8"));
          const key = `${name}@${version}`;
          if (packages.has(key)) continue;

          const notices = readdirSync(directory, { withFileTypes: true })
            .filter((file) => file.isFile() && /^(licen[cs]e|copying|notice)([.-]|$)/i.test(file.name))
            .map((file) => `${file.name}\n${readFileSync(join(directory, file.name), "utf8")}`);

          packages.set(key, `${key} (${JSON.stringify(license ?? "unspecified")})\n${notices.join("\n\n")}`);
        }

        this.emitFile({
          type: "asset",
          fileName: "THIRD_PARTY_NOTICES.txt",
          source: [...packages]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([, notice]) => notice)
            .join("\n\n---\n\n"),
        });
      },
    },
  ],

  clean: true,
  dts: false,
});
