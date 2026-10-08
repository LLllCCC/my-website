// nav.js - 全站统一导航栏
function loadNavbar() {
  const menuIcon =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 8h10"/><path d="M7 12h10"/><path d="M7 16h10"/></svg>';

  const navHTML =
    '<a class="skip-link" href="#main-content">跳至正文</a>' +
    "<nav>" +
    '  <div class="nav-container">' +
    '    <div class="logo">' +
    '      <a href="/index.html" class="logo-link">' +
    '        <img src="/img/yopo_logo.png" alt="YOPO" class="logo-svg">' +
    "      </a>" +
    "    </div>" +
    '    <div class="nav-links">' +
    '      <div class="menu-wrapper">' +
    '        <button class="logo-icon" id="menu-btn" type="button" aria-label="菜单" aria-expanded="false" aria-controls="nav-dropdown">' +
    menuIcon +
    "</button>" +
    '        <div class="nav-dropdown" id="nav-dropdown" aria-hidden="true" inert>' +
    '          <a href="/index.html" class="nav-dropdown-link">主页</a>' +
    '          <a href="/blog.html" class="nav-dropdown-link">博客</a>' +
    '          <a href="/archive.html" class="nav-dropdown-link">归档</a>' +
    '          <a href="/motion-web/cases/" class="nav-dropdown-link">动效案例</a>' +
    '          <a href="/site.html" class="nav-dropdown-link">这个网站</a>' +
    "        </div>" +
    "      </div>" +
    '      <button id="theme-toggle" class="nav-theme-toggle" type="button" aria-label="切换主题" aria-pressed="false">' +
    '        <img src="/img/sun.png" class="icon-sun theme-icon-img" alt="Light Mode">' +
    '        <img src="/img/moon.png" class="icon-moon theme-icon-img" alt="Dark Mode">' +
    "      </button>" +
    "    </div>" +
    "  </div>" +
    "</nav>";

  const navPlaceholder = document.getElementById("global-nav");
  if (navPlaceholder) {
    navPlaceholder.innerHTML = navHTML;
  }

  const currentPath = window.location.pathname.replace(/\/$/, "") || "/";
  document.querySelectorAll(".nav-dropdown-link").forEach(function (link) {
    const linkPath = new URL(link.href, window.location.href).pathname.replace(/\/$/, "") || "/";
    const isCurrent =
      currentPath === linkPath || (linkPath === "/blog.html" && currentPath === "/post.html");
    if (isCurrent) link.setAttribute("aria-current", "page");
  });

  // 菜单下拉
  const menuBtn = document.getElementById("menu-btn");
  const dropdown = document.getElementById("nav-dropdown");

  if (menuBtn && dropdown) {
    const closeMenu = function () {
      dropdown.classList.remove("open");
      dropdown.setAttribute("aria-hidden", "true");
      dropdown.setAttribute("inert", "");
      menuBtn.setAttribute("aria-expanded", "false");
    };

    menuBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const isOpen = dropdown.classList.toggle("open");
      dropdown.setAttribute("aria-hidden", (!isOpen).toString());
      if (isOpen) dropdown.removeAttribute("inert");
      else dropdown.setAttribute("inert", "");
      menuBtn.setAttribute("aria-expanded", isOpen.toString());
    });

    document.addEventListener("click", function (e) {
      if (!dropdown.contains(e.target) && e.target !== menuBtn) {
        closeMenu();
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && dropdown.classList.contains("open")) {
        closeMenu();
        menuBtn.focus();
      }
    });
  }

  // 主题切换
  const toggleBtn = document.getElementById("theme-toggle");
  if (toggleBtn) {
    const updateToggleState = function () {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      toggleBtn.setAttribute("aria-pressed", (currentTheme === "light").toString());
      toggleBtn.setAttribute(
        "aria-label",
        currentTheme === "light" ? "切换到深色模式" : "切换到浅色模式"
      );
    };

    updateToggleState();

    toggleBtn.addEventListener("click", function () {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      const newTheme = currentTheme === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", newTheme);
      try {
        localStorage.setItem("theme", newTheme);
      } catch (error) {
        // Theme still changes for this visit when storage is unavailable.
      }
      updateToggleState();
    });
  }
}

document.addEventListener("DOMContentLoaded", loadNavbar);
