import { defineConfig } from "vite";
import { cpSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { homeHtml } from "./src/ui/home.js";
import { SITE } from "./src/data.js";

function deploymentSiteUrl(){
  const defaultPagesUrl = process.env.CF_PAGES_BRANCH === "main"
    ? "https://fujii-kaze-taiwan-2026.pages.dev/"
    : process.env.CF_PAGES_URL;
  const url = new URL(process.env.SITE_URL || defaultPagesUrl || SITE.url);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/"){
    throw new Error("SITE_URL / Cloudflare Pages URL must be an HTTPS site root without credentials, query or hash.");
  }
  return url.href;
}

function prerenderHome(siteUrl){
  return {
    name: "prerender-home",
    transformIndexHtml: {
      order: "pre",
      handler(html){
        const { version } = JSON.parse(readFileSync(resolve("package.json"), "utf8"));
        return html.replaceAll(SITE.url, siteUrl)
          .replace('<main id="app"></main>', `<main id="app">${homeHtml(`v${version}`)}</main>`);
      }
    }
  };
}

function copyRootStaticAssets(siteUrl){
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
      const files = ["sw.js", "manifest.json", "robots.txt", "sitemap.xml", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"];
      // Keep GitHub Pages compatibility without publishing its domain on Pages.
      if (process.env.CF_PAGES !== "1") files.push("CNAME");
      files.forEach(file => cpSync(resolve(file), resolve(outputDir, file)));
      for (const file of ["robots.txt", "sitemap.xml"]){
        const path = resolve(outputDir, file);
        writeFileSync(path, readFileSync(path, "utf8").replaceAll(SITE.url, siteUrl));
      }
      cpSync(resolve("images"), resolve(outputDir, "images"), { recursive: true });

      const assetUrls = [...new Set(buildAssetUrls)];
      const serviceWorkerPath = resolve(outputDir, "sw.js");
      const serviceWorker = readFileSync(serviceWorkerPath, "utf8")
        .replace("const VITE_BUILD_ASSETS = [];", `const VITE_BUILD_ASSETS = ${JSON.stringify(assetUrls)};`);
      writeFileSync(serviceWorkerPath, serviceWorker);
    }
  };
}

export default defineConfig(() => ({
  base: "./",
  plugins: [prerenderHome(deploymentSiteUrl()), copyRootStaticAssets(deploymentSiteUrl())],
  server: {
    allowedHosts: ["vn7591g.tail12ac60.ts.net"]
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsInlineLimit: 0
  }
}));
