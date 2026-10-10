// 首页和静态页的滚动入场。
//
// 原本 .fade-in 是"页面一加载就把动画播完"，所以下滚看到的区块是直接出现的。
// 这里改成进入视口才播。三处关键取舍：
//
// 1. 用 animation 而不是 transition 来做入场。
//    卡片本身有自己的 hover transition，如果走 transition 就得在元素上写
//    transition-delay，那会把 hover 一起延迟掉（踩过这个坑）。animation-delay 不干扰 transition。
// 2. 隐藏元素的前提是 has-reveal 类存在，而这个类由 theme-init.js 在首次绘制前打上，
//    且只在支持 IntersectionObserver + 用户没要求减少动效时才打。
//    任何一环不成立，元素就从来不曾被隐藏过——宁可退化成旧行为，也不能把内容藏起来。
// 3. 首屏元素保留原有的错峰节奏，滚动进入视口的元素不加延迟（加了会显得迟钝）。
const root = document.documentElement;

function setupReveal() {
  if (!root.classList.contains("has-reveal")) return;
  const items = Array.prototype.slice.call(document.querySelectorAll(".fade-in"));
  if (!items.length) return;

  function reveal(el) {
    el.classList.add("is-revealed");
  }

  if (!("IntersectionObserver" in window)) {
    items.forEach(reveal);
    return;
  }

  // 首屏（首帧就可见）的元素才需要错峰，滚动进来的不需要
  const firstScreen = items.filter(function (el) {
    const rect = el.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  });

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        observer.unobserve(entry.target);
      });
    },
    // 观察区往下扩 8%，也就是"提前"一点揭示。
    // 这里不能用负的 rootMargin（-8% 那种"进入视口后再等一会儿"的写法）：
    // 一张卡片正好卡在折叠线上时，它的顶边落在负边距里，会一直不入场，
    // 屏幕上就留出一块空白，看起来像内容丢了。宁可早揭示，不可留空白。
    { rootMargin: "0px 0px 8% 0px", threshold: 0 }
  );

  items.forEach(function (el, index) {
    el.style.animationDelay = firstScreen.indexOf(el) !== -1 ? index * 70 + "ms" : "0ms";
    observer.observe(el);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupReveal);
} else {
  setupReveal();
}
