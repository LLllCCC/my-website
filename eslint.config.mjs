import js from "@eslint/js";
import globals from "globals";

export default [
  // motion-web 是外部 CC BY-NC 案例素材，不参与 lint。
  { ignores: ["motion-web/**"] },
  js.configs.recommended,
  {
    // 根目录 *.js 是浏览器端经典脚本（<script> 直接引入，无构建）。
    files: ["*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "script",
      globals: globals.browser,
    },
  },
  {
    // 使用共享全局的页面脚本。config.js 是定义方（用 /* exported */ 声明），不在此列。
    files: ["*.js"],
    ignores: ["config.js"],
    languageOptions: {
      globals: {
        // 跨文件共享的全局（阶段 4 ESM 化后改为显式 import）。
        CONFIG: "readonly",
        showToast: "readonly",
        debounce: "readonly",
        renderCommentMarkdown: "readonly",
        // CDN 经典脚本提供的全局（post.html 引入）。
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
    rules: {
      // localStorage 等调用统一用 catch (_) {} 静默降级，是本仓库的约定写法。
      "no-unused-vars": ["error", { args: "none", caughtErrors: "none" }],
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
];
