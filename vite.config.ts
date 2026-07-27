import { defineConfig } from "vite";

// Relative base so the same build works locally and on GitHub Pages
// (which serves project sites from /<repo-name>/).
export default defineConfig({
  base: "./",
});
