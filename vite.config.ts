import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  base: "/xqw/",
  resolve: {
    alias: {
      src: path.resolve(__dirname, "src")
    }
  }
});
