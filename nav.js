// nav.js — Apple-style minimal navbar
function loadNavbar() {
  var navHTML =
    '<nav>' +
    '  <div class="nav-container">' +
    '    <a href="/" class="logo-link">' +
    '      <img src="https://cdn.jsdelivr.net/gh/LLllCCC/tuchaung@ff861f502864f59d6e53d54eab11ff9f785deccb/img/yopo_logo.png" alt="YOPO" class="logo-svg">' +
    "    </a>" +
    '    <button id="theme-toggle" class="theme-toggle" type="button" aria-label="切换主题" aria-pressed="false">' +
    '      <img src="https://cdn.jsdelivr.net/gh/LLllCCC/tuchaung@main/img/sun.png" class="icon-sun theme-icon" alt="Light">' +
    '      <img src="https://cdn.jsdelivr.net/gh/LLllCCC/tuchaung@main/img/moon.png" class="icon-moon theme-icon" alt="Dark">' +
    "    </button>" +
    "  </div>" +
    "</nav>";

  var placeholder = document.getElementById("global-nav");
  if (placeholder) placeholder.innerHTML = navHTML;

  // Theme toggle
  var btn = document.getElementById("theme-toggle");
  if (!btn) return;

  var sync = function () {
    var t = document.documentElement.getAttribute("data-theme");
    btn.setAttribute("aria-pressed", (t === "light").toString());
  };
  sync();

  btn.addEventListener("click", function () {
    var next =
      document.documentElement.getAttribute("data-theme") === "light"
        ? "dark"
        : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    sync();
  });
}

document.addEventListener("DOMContentLoaded", loadNavbar);
