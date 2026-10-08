// footer.js - 全站通用页脚
document.addEventListener("DOMContentLoaded", function () {
  const year = new Date().getFullYear();
  const footerHTML =
    '<footer class="site-footer">' +
    "<p>© " +
    year +
    " Yopo</p>" +
    '<p class="footer-links">' +
    '<a href="/index.html">首页</a>' +
    '<a href="/blog.html">博客</a>' +
    '<a href="/archive.html">归档</a>' +
    '<a href="/motion-web/cases/">动效案例</a>' +
    '<a href="/site.html">这个网站</a>' +
    '<a href="/feed.xml">RSS</a>' +
    "</p>" +
    '<p class="footer-note">用原生 HTML/CSS/JS 手写，部署在自己的 VPS 上。</p>' +
    "</footer>";

  const footerPlaceholder = document.getElementById("global-footer");
  if (footerPlaceholder) {
    footerPlaceholder.innerHTML = footerHTML;
  }

  // 回到顶部按钮
  const topBtn = document.createElement("button");
  topBtn.className = "back-to-top";
  topBtn.type = "button";
  topBtn.setAttribute("aria-label", "回到顶部");
  topBtn.innerHTML = '<i class="ri-arrow-up-line"></i>';
  document.body.appendChild(topBtn);

  topBtn.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  let ticking = false;
  window.addEventListener("scroll", function () {
    if (!ticking) {
      requestAnimationFrame(function () {
        if (window.scrollY > 300) {
          topBtn.classList.add("visible");
        } else {
          topBtn.classList.remove("visible");
        }
        ticking = false;
      });
      ticking = true;
    }
  });
});
