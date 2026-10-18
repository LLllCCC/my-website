import js from "@eslint/js";
import globals from "globals";

export default [
  // motion-web 是外部 CC BY-NC 案例素材，不参与 lint。
  // lib/ 是 vendored 的压缩第三方库（marked/DOMPurify/highlight.js/remixicon），同样不参与。
  { ignores: ["motion-web/**", "lib/**"] },
  js.configs.recommended,
  {
    // 根目录 *.js 全部是浏览器端 ES Module（<script type="module"> 或被 import）。
    files: ["*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        ...globals.browser,
        // CDN 经典脚本提供的全局（post.html 引入 marked + DOMPurify）。
        marked: "readonly",
        DOMPurify: "readonly",
      },
    },
  },
  {
    // scripts/*.mjs 是 Node 端工具脚本（发布、测试）。
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: globals.node,
    },
  },
  {
    // functions/**/*.js 是 Cloudflare Pages Functions（Workers 运行时，非浏览器非 Node）。
    files: ["functions/**/*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        URL: "readonly",
        URLSearchParams: "readonly",
        Request: "readonly",
        Response: "readonly",
        Headers: "readonly",
        fetch: "readonly",
        caches: "readonly",
        crypto: "readonly",
        FormData: "readonly",
        Blob: "readonly",
        ArrayBuffer: "readonly",
        TextEncoder: "readonly",
        TextDecoder: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        console: "readonly",
      },
    },
  },
  {
    rules: {
      // localStorage 等调用统一用 catch (_) {} 静默降级，是本仓库的约定写法。
      "no-unused-vars": ["error", { args: "none", caughtErrors: "none" }],
      "no-empty": ["error", { allowEmptyCatch: true }],
      // 新代码统一 const/let，不再新增 var。
      "no-var": "error",
      "prefer-const": "error",
    },
  },
];
