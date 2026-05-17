// 全站统一配置
var CONFIG = {
  API_BASE: "https://yopoo.888431.xyz/api",
  POSTS_URL: "https://yopoo.888431.xyz/api/posts",
  SITE_NAME: "Yopo",
  SITE_URL: "https://yopo.888431.xyz",
};

// HTML 转义 —— 防止 XSS 攻击
function escapeHtml(str) {
  if (str == null) return "";
  var div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// Toast 通知工具
function showToast(message) {
  var toast = document.createElement("div");
  toast.className = "toast-notification";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(function () {
    toast.classList.add("fade-out");
    setTimeout(function () { toast.remove(); }, 500);
  }, 3000);
}

// 防抖工具
function debounce(fn, delay) {
  var timer = null;
  return function () {
    var ctx = this;
    var args = arguments;
    clearTimeout(timer);
    timer = setTimeout(function () { fn.apply(ctx, args); }, delay);
  };
}
