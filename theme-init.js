// 将主题初始化从 index.html 移到此文件，页面头部直接引用此脚本以避免主题闪烁
(function () {
  try {
    const t = localStorage.getItem("theme");
    if (t === "light" || t === "dark") {
      document.documentElement.setAttribute("data-theme", t);
    }
  } catch (e) {
    /* ignore */
  }

  // 滚动入场（reveal.js）的前置开关。
  // 这里是唯一安全的判定点：它在首次绘制前运行，能避免"先显示再隐藏"的闪烁。
  // 判定不通过时不加这个类，.fade-in 就保持原来的"加载即播"动画——
  // 也就是说 JS 失效或用户要求减少动效时，内容始终可见，不会白屏。
  try {
    if (
      "IntersectionObserver" in window &&
      window.matchMedia("(prefers-reduced-motion: no-preference)").matches
    ) {
      document.documentElement.classList.add("has-reveal");
    }
  } catch (e) {
    /* ignore */
  }
})();
