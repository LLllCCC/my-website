// =========================================================
// 1. Email 卡片点击监听
// =========================================================
const mailtoLink = document.querySelector('a[href^="mailto:"]');
if (mailtoLink) {
  mailtoLink.addEventListener("click", function (e) {
    // 逻辑 B: 时间判断与问候
    const now = new Date();
    const hour = now.getHours();
    let greeting = "";

    if (hour >= 5 && hour < 11) greeting = "早上好！☀️";
    else if (hour >= 11 && hour < 13) greeting = "中午好！🍽️";
    else if (hour >= 13 && hour < 18) greeting = "下午好！☕";
    else if (hour >= 18 && hour < 22) greeting = "晚上好！🌙";
    else greeting = "夜深了，注意休息哦！🌃";

    showToast(`${greeting} 正在为您唤起邮件客户端...`);
  });
} else {
  console.warn(
    '邮件链接元素未找到：a[href^="mailto:"] — 未绑定点击音效/问候逻辑。',
  );
}

// =========================================================
// 2. 实时时间
// =========================================================
(function () {
  const timeElement = document.getElementById("local-time");
  if (!timeElement) return;

  function updateTime() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
    timeElement.textContent = `${h}:${m}:${s}`;
  }

  const timer = setInterval(updateTime, 1000);
  updateTime();

  window.addEventListener("beforeunload", () => clearInterval(timer));
})();

// =========================================================
// 3. 轻量视差效果，仅在支持鼠标且未启用减少动态效果时运行
// =========================================================
const canTiltCards = window.matchMedia(
  "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
).matches;

if (canTiltCards) {
  document.addEventListener("DOMContentLoaded", function () {
    const cards = document.querySelectorAll(".card:not(.card-social-container)");

    cards.forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const limit = 8;
        const rotateX = -((y - centerY) / centerY) * limit;
        const rotateY = ((x - centerX) / centerX) * limit;

        card.style.setProperty("--tilt-x", `${rotateX}deg`);
        card.style.setProperty("--tilt-y", `${rotateY}deg`);
        card.classList.add("is-tilting");
      });

      card.addEventListener("mouseleave", () => {
        card.classList.remove("is-tilting");
        card.style.removeProperty("--tilt-x");
        card.style.removeProperty("--tilt-y");
      });
    });
  });
}

// 首页博客卡片始终展示最近发布文章的标题和封面。
document.addEventListener("DOMContentLoaded", async function () {
  const card = document.getElementById("home-blog-card");
  if (!card || !window.CONFIG) return;
  try {
    const response = await fetch(CONFIG.POSTS_URL, { headers: { Accept: "application/json" } });
    if (!response.ok) return;
    const posts = await response.json();
    if (!Array.isArray(posts) || !posts.length) return;
    const newest = posts.filter((post) => post && post.id != null).sort((a, b) => {
      const dateDiff = (Date.parse(b.date || "") || 0) - (Date.parse(a.date || "") || 0);
      return dateDiff || Number(b.id) - Number(a.id);
    })[0];
    if (!newest) return;

    const title = document.getElementById("home-blog-title");
    const desc = document.getElementById("home-blog-desc");
    if (title && typeof newest.title === "string" && newest.title.trim()) title.textContent = newest.title;
    if (desc) desc.textContent = typeof newest.description === "string" && newest.description.trim() && newest.description !== newest.title
      ? newest.description
      : "最新发布 · 点击阅读全文";
    if (typeof newest.cover === "string" && newest.cover.trim()) {
      const coverUrl = new URL(newest.cover, window.location.href);
      if (coverUrl.protocol === "https:" || coverUrl.protocol === "http:") {
        card.style.backgroundImage = "url(" + JSON.stringify(coverUrl.href) + ")";
      }
    }
    card.setAttribute("aria-label", "打开最新博客文章：" + (newest.title || "博客"));
  } catch (error) {
    console.warn("首页博客卡片未能更新:", error);
  }
});
