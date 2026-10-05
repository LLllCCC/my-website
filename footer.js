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
    "</p>" +
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
