// =========================================================
// 1. Email 卡片点击监听 (保持不变)
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
// 2. Toast 弹窗工具 (保持不变)
// =========================================================
function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast-notification";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

// =========================================================
// 3. 实时时间 (保持不变)
// =========================================================
function updateTime() {
  const timeElement = document.getElementById("local-time");
  if (!timeElement) return;
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  timeElement.textContent = `${h}:${m}:${s}`;
}

setInterval(updateTime, 1000);
updateTime();

// =========================================================
// 4. 深色模式切换 (保持不变)
// =========================================================
const themeToggle = document.getElementById("theme-toggle");
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const root = document.documentElement;
    const isLight = root.getAttribute("data-theme") === "light";

    if (isLight) {
      root.removeAttribute("data-theme"); // 移除 light 回到默认 dark
      try {
        localStorage.removeItem("theme");
      } catch (e) {}
      showToast("已开启深色模式 🌙");
    } else {
      root.setAttribute("data-theme", "light"); // 开启清新蓝模式
      try {
        localStorage.setItem("theme", "light");
      } catch (e) {}
      showToast("已开启清新模式 ✨");
    }
  });
}

// =========================================================
// 5. 鼠标停止检测 (保持不变)
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
// 🌟 核心修改：C 计划 - API 自动对接逻辑 🌟
// =========================================================
document.addEventListener("DOMContentLoaded", async function () {
  // 你的 API 地址
  const API_URL = "https://yopoo.888431.xyz/api/posts";

  try {
    console.log("正在尝试连接 API:", API_URL);

    // 1. 发起请求
    const response = await fetch(API_URL);

    // 2. 检查响应
    if (!response.ok) {
      throw new Error(`网络错误: ${response.status}`);
    }

    // 3. 解析 JSON 数据
    const posts = await response.json();
    console.log("成功获取文章数据:", posts);

    // 4. 如果有数据，取出最新的一篇（通常是数组第一个，或者按日期排序）
    if (posts && posts.length > 0) {
      // 简单排序：确保显示日期最新的那一篇
      // (假设 date 格式是 'YYYY-MM-DD')
      posts.sort((a, b) => new Date(b.date) - new Date(a.date));

      const latestPost = posts[0]; // 取出排序后的第一篇

      // 5. 更新网页元素
      const card = document.getElementById("home-blog-card");
      const title = document.getElementById("home-blog-title");
      const desc = document.getElementById("home-blog-desc");
      // 如果你有给卡片加链接的需求，可以把下面这行解开
      // const link = document.getElementById("home-blog-link");

      if (card && title && desc) {
        // 更新标题
        title.textContent = latestPost.title;
        // 更新简介
        desc.textContent = latestPost.description;
        // 更新背景图
        if (latestPost.cover) {
          card.style.backgroundImage = `url('${latestPost.cover}')`;
        }
        // 更新链接跳转 (如果有)
        // if (link) link.href = latestPost.link;

        console.log("首页卡片已更新为:", latestPost.title);
      }
    } else {
      console.warn("API 返回了空数组");
    }
  } catch (error) {
    console.error("无法获取博客数据:", error);
    // 可选：如果失败，显示一个 Toast 提示
    // showToast("博客数据加载失败，请检查后端服务");
  }
});

// =========================================================
// 8. 高级 3D 视差悬停特效 (保持不变)
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
