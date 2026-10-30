import { defineConfig } from "vite";
import { cpSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { homeHtml } from "./src/ui/home.js";

function prerenderHome(){
  return {
    name: "prerender-home",
    transformIndexHtml: {
      order: "pre",
      handler(html){
        const { version } = JSON.parse(readFileSync(resolve("package.json"), "utf8"));
        return html.replace('<main id="app"></main>', `<main id="app">${homeHtml(`v${version}`)}</main>`);
      }
    }
  };
}

function copyRootStaticAssets(){
  let buildAssetUrls = [];
  return {
    name: "copy-root-static-assets",
    apply: "build",
    generateBundle(_options, bundle){
      // Cache this build's graph, including lazy chunks. Retain public/assets
      // for old cached HTML without downloading those obsolete entries again.
      buildAssetUrls = Object.keys(bundle)
        .filter(file => file.startsWith("assets/"))
        .map(file => `./${file}`);
    },
    closeBundle(){
      const outputDir = resolve("dist");
      ["CNAME", "sw.js", "manifest.json", "robots.txt", "sitemap.xml", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"]
        .forEach(file => cpSync(resolve(file), resolve(outputDir, file)));
      cpSync(resolve("images"), resolve(outputDir, "images"), { recursive: true });

      const assetUrls = [...new Set(buildAssetUrls)];
      const serviceWorkerPath = resolve(outputDir, "sw.js");
      const serviceWorker = readFileSync(serviceWorkerPath, "utf8")
        .replace("const VITE_BUILD_ASSETS = [];", `const VITE_BUILD_ASSETS = ${JSON.stringify(assetUrls)};`);
      writeFileSync(serviceWorkerPath, serviceWorker);
    }
  };
}

export default defineConfig({
  base: "./",
  plugins: [prerenderHome(), copyRootStaticAssets()],
  server: {
    allowedHosts: ["vn7591g.tail12ac60.ts.net"]
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsInlineLimit: 0
  }
});
