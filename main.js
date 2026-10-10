// 首页专用脚本：邮件卡片、卡片视差、最新文章卡片。
import { CONFIG, safeHttpUrl, showToast } from "./config.js?v=37";

// =========================================================
// 1. Email 卡片点击监听
// =========================================================
// 邮件卡片只在首页存在，其他页面没有这个元素就什么都不做。
const mailtoLink = document.querySelector('a[href^="mailto:"]');
if (mailtoLink) {
  mailtoLink.addEventListener("click", function (e) {
    showToast("正在打开邮件客户端");
  });
}

// =========================================================
// 2. 轻量视差效果，仅在支持鼠标且未启用减少动态效果时运行
// =========================================================
const canTiltCards = window.matchMedia(
  "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)"
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

// =========================================================
// 3. Hero 指针交互：把归一化坐标写进 CSS 变量，视差与聚光由 home.css 消费
// =========================================================
// 与卡片倾斜同一套开关（有精确指针 + 未要求减少动效），所以触屏和
// "减少动效"用户根本不会走到这里；home.css 那边还有一层同条件的媒体查询兜底。
const heroCard = document.getElementById("home");
if (heroCard && canTiltCards) {
  const resetHero = () => {
    heroCard.style.setProperty("--hero-x", "0");
    heroCard.style.setProperty("--hero-y", "0");
  };

  heroCard.addEventListener("pointermove", (e) => {
    const rect = heroCard.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    // 夹到 -1..1：指针贴边或略微越界时不该把效果放大到失控
    const clamp = (v) => Math.max(-1, Math.min(1, v));
    const x = clamp(((e.clientX - rect.left) / rect.width) * 2 - 1);
    const y = clamp(((e.clientY - rect.top) / rect.height) * 2 - 1);
    heroCard.style.setProperty("--hero-x", x.toFixed(3));
    heroCard.style.setProperty("--hero-y", y.toFixed(3));
  });

  heroCard.addEventListener("pointerleave", resetHero);
  resetHero();
}

// 首页博客卡片始终展示最近发布文章的标题和封面。
document.addEventListener("DOMContentLoaded", async function () {
  const card = document.getElementById("home-blog-card");
  if (!card) return;
  try {
    const response = await fetch(CONFIG.POSTS_URL, { headers: { Accept: "application/json" } });
    if (!response.ok) return;
    const posts = await response.json();
    if (!Array.isArray(posts) || !posts.length) return;
    const newest = posts
      .filter((post) => post && post.id != null)
      .sort((a, b) => {
        const dateDiff = (Date.parse(b.date || "") || 0) - (Date.parse(a.date || "") || 0);
        return dateDiff || Number(b.id) - Number(a.id);
      })[0];
    if (!newest) return;

    const title = document.getElementById("home-blog-title");
    const desc = document.getElementById("home-blog-desc");
    if (title && typeof newest.title === "string" && newest.title.trim())
      title.textContent = newest.title;
    if (desc)
      desc.textContent =
        typeof newest.description === "string" &&
        newest.description.trim() &&
        newest.description !== newest.title
          ? newest.description
          : "最新发布 · 点击阅读全文";
    const coverUrl = safeHttpUrl(newest.cover);
    if (coverUrl) {
      card.style.backgroundImage = "url(" + JSON.stringify(coverUrl) + ")";
    }
    card.setAttribute("aria-label", "打开最新博客文章：" + (newest.title || "博客"));
  } catch (error) {
    console.warn("首页博客卡片未能更新:", error);
  }
});
