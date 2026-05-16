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
});
