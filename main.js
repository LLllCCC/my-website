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
// 3. 鼠标停止检测
// =========================================================
(function () {
  const els = document.querySelectorAll(".card-social");
  els.forEach((el) => {
    let timer = null;
    el.addEventListener("mousemove", () => {
      if (timer) clearTimeout(timer);
      if (el.classList.contains("stopped")) el.classList.remove("stopped");
      timer = setTimeout(() => {
        el.classList.add("stopped");
      }, 600);
    });
    el.addEventListener("mouseleave", () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      el.classList.remove("stopped");
    });
    // 支持键盘焦点触发
    el.setAttribute("tabindex", "0");
    el.addEventListener("focus", () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => el.classList.add("stopped"), 600);
    });
    el.addEventListener("blur", () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      el.classList.remove("stopped");
    });
  });
})();

// =========================================================
// 4. 高级 3D 视差悬停特效
// =========================================================
document.addEventListener("DOMContentLoaded", function () {
  const cards = document.querySelectorAll(".card:not(.card-social-container)");

  cards.forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const limit = 8;
      const rotateX = -((y - centerY) / centerY) * limit;
      const rotateY = ((x - centerX) / centerX) * limit;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });

    card.addEventListener("mouseenter", () => {
      card.style.transition = "none";
    });

    card.addEventListener("mouseleave", () => {
      card.style.transition = "transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)";
      card.style.transform =
        "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
    });
  });
});
