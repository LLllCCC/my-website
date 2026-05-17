// nav.js - 全站统一导航栏
function loadNavbar() {
  var path = window.location.pathname;
  var isBlogSection = path.includes("blog.html") || path.includes("post.html");

  var menuIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 8h10"/><path d="M7 12h10"/><path d="M7 16h10"/></svg>';

  var navHTML =
    '<nav>' +
    '  <div class="nav-container">' +
    '    <div class="logo">' +
    '      <a href="/index.html" class="logo-link">' +
    '        <img src="https://cdn.jsdelivr.net/gh/LLllCCC/tuchaung@ff861f502864f59d6e53d54eab11ff9f785deccb/img/yopo_logo.png" alt="YOPO" class="logo-svg">' +
    '      </a>' +
    (isBlogSection ? '<span>/</span><a href="/blog.html">BLOG</a>' : '') +
    '    </div>' +
    '    <div class="nav-links">' +
    '      <div class="menu-wrapper">' +
    '        <button class="logo-icon" id="menu-btn" type="button" aria-label="菜单">' + menuIcon + '</button>' +
    '        <div class="nav-dropdown" id="nav-dropdown">' +
    '          <a href="/index.html" class="nav-dropdown-link">主页</a>' +
    '          <a href="/blog.html" class="nav-dropdown-link">博客</a>' +
    '        </div>' +
    '      </div>' +
    '      <button id="theme-toggle" class="nav-theme-toggle" type="button" aria-label="切换主题" aria-pressed="false">' +
    '        <img src="https://cdn.jsdelivr.net/gh/LLllCCC/tuchaung@main/img/sun.png" class="icon-sun theme-icon-img" alt="Light Mode">' +
    '        <img src="https://cdn.jsdelivr.net/gh/LLllCCC/tuchaung@main/img/moon.png" class="icon-moon theme-icon-img" alt="Dark Mode">' +
    '      </button>' +
    '    </div>' +
    '  </div>' +
    '</nav>';

  var navPlaceholder = document.getElementById("global-nav");
  if (navPlaceholder) {
    navPlaceholder.innerHTML = navHTML;
  }

  // 菜单下拉
  var menuBtn = document.getElementById("menu-btn");
  var dropdown = document.getElementById("nav-dropdown");

  if (menuBtn && dropdown) {
    menuBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      dropdown.classList.toggle("open");
    });

    document.addEventListener("click", function (e) {
      if (!dropdown.contains(e.target) && e.target !== menuBtn) {
        dropdown.classList.remove("open");
      }
    });
  }

  // 主题切换
  var toggleBtn = document.getElementById("theme-toggle");
  if (toggleBtn) {
    var updateToggleState = function () {
      var currentTheme = document.documentElement.getAttribute("data-theme");
      toggleBtn.setAttribute("aria-pressed", (currentTheme === "light").toString());
    };

    updateToggleState();

    toggleBtn.addEventListener("click", function () {
      var currentTheme = document.documentElement.getAttribute("data-theme");
      var newTheme = currentTheme === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("theme", newTheme);
      updateToggleState();
    });
  }
}

document.addEventListener("DOMContentLoaded", loadNavbar);
