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
