// 全站键盘快捷键。
//
// 设计原则：每个动作都通过"点击页面上已有的那个元素"来完成，不复制各页面的业务逻辑——
// 切主题就是点 #theme-toggle，翻篇就是点相邻文章链接。这样那些功能各自演化时，
// 快捷键不会跟着失效，这里也永远不需要知道主题是怎么存的、文章是怎么加载的。
//
// 一条铁律：在输入框里打字时，所有单键快捷键必须让路。否则访客在搜索框打个 "t"
// 就被切主题、打个 "/" 就跳走，那比没有快捷键更糟。所以下面用 isTyping() 统一拦截。
(function () {
  "use strict";

  // 事件源是不是一个正在接受文字输入的地方
  function isTyping(target) {
    if (!target || typeof target.tagName !== "string") return false;
    const tag = target.tagName;
    return (
      tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable === true
    );
  }

  // 元素是不是真的能被用户点到（隐藏容器里的不算）
  function isClickable(el) {
    if (!el) return false;
    if (el.hasAttribute("hidden")) return false;
    if (el.closest("[hidden]")) return false;
    return el.offsetParent !== null || el.getClientRects().length > 0;
  }

  // 页面上的搜索框：不同页面 id 不同，按优先级找一个出来
  function findSearchInput() {
    return document.querySelector(
      "#blog-search, #archive-search, #tag-search, .blog-search input[type='search'], input[type='search']"
    );
  }

  document.addEventListener("keydown", function (e) {
    if (e.defaultPrevented) return;
    // 带修饰键的组合留给浏览器和系统（Ctrl+F 之类不该被抢）
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (isTyping(e.target)) return;

    // "/" —— 聚焦搜索框（和 GitHub、MDN 一致的习惯）
    if (e.key === "/") {
      const input = findSearchInput();
      if (input) {
        e.preventDefault();
        input.focus();
        input.select();
      }
      return;
    }

    // "t" —— 切主题
    if (e.key === "t" || e.key === "T") {
      const toggle = document.getElementById("theme-toggle");
      if (isClickable(toggle)) {
        e.preventDefault();
        toggle.click();
      }
      return;
    }

    // "j" / "k" —— 文章页翻到下一篇 / 上一篇
    if (e.key === "j" || e.key === "k") {
      const link = document.querySelector(
        e.key === "j" ? ".article-neighbor--newer" : ".article-neighbor--older"
      );
      if (isClickable(link)) {
        e.preventDefault();
        link.click();
      }
    }
  });
})();
