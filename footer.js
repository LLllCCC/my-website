// footer.js - 全站通用页脚
document.addEventListener("DOMContentLoaded", function () {
  var year = new Date().getFullYear();
  var footerHTML =
    '<footer class="site-footer">' +
    '<p>© ' + year + ' Yopo. Designed with Apple Style.</p>' +
    '<p class="footer-links">' +
    '<a href="/index.html">首页</a> | ' +
    '<a href="/blog.html">博客</a>' +
    '</p>' +
    '</footer>';

  var footerPlaceholder = document.getElementById("global-footer");
  if (footerPlaceholder) {
    footerPlaceholder.innerHTML = footerHTML;
  }

  // 回到顶部按钮
  var topBtn = document.createElement("button");
  topBtn.className = "back-to-top";
  topBtn.setAttribute("aria-label", "回到顶部");
  topBtn.innerHTML = '<i class="ri-arrow-up-line"></i>';
  document.body.appendChild(topBtn);

  topBtn.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  var ticking = false;
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
