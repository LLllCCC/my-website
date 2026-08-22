// main.js — Apple-style interactions

// 1. Email card greeting
(function () {
  var link = document.querySelector('a[href^="mailto:"]');
  if (!link) return;
  link.addEventListener("click", function () {
    var h = new Date().getHours();
    var g =
      h >= 5 && h < 11
        ? "早上好！☀️"
        : h >= 11 && h < 13
          ? "中午好！🍽️"
          : h >= 13 && h < 18
            ? "下午好！☕"
            : h >= 18 && h < 22
              ? "晚上好！🌙"
              : "夜深了，注意休息哦！🌃";
    showToast(g + " 正在为您唤起邮件客户端...");
  });
})();

// 2. Scroll-reveal for .reveal elements
(function () {
  var items = document.querySelectorAll(".reveal");
  if (!items.length) return;

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 },
  );

  items.forEach(function (el) {
    observer.observe(el);
  });
})();

// 3. Back-to-top button
(function () {
  var btn = document.createElement("button");
  btn.className = "back-to-top";
  btn.setAttribute("aria-label", "回到顶部");
  btn.innerHTML = '<i class="ri-arrow-up-line"></i>';
  document.body.appendChild(btn);

  btn.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  var ticking = false;
  window.addEventListener("scroll", function () {
    if (!ticking) {
      requestAnimationFrame(function () {
        btn.classList.toggle("visible", window.scrollY > 400);
        ticking = false;
      });
      ticking = true;
    }
  });
})();
