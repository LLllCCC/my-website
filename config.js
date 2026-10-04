// 全站共享工具：各页面脚本通过经典脚本全局使用（/* exported */ 声明给 lint）。
/* exported CONFIG, showToast, debounce */
var CONFIG = {
  API_BASE: "/api",
  POSTS_URL: "/api/posts",
  SITE_NAME: "Yopo",
  SITE_URL: "https://yopoo.888431.xyz",
};

// Toast 通知工具
function showToast(message) {
  var toast = document.createElement("div");
  toast.className = "toast-notification";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(function () {
    toast.classList.add("fade-out");
    setTimeout(function () {
      toast.remove();
    }, 500);
  }, 3000);
}

// 防抖工具
function debounce(fn, delay) {
  var timer = null;
  return function () {
    var ctx = this;
    var args = arguments;
    clearTimeout(timer);
    timer = setTimeout(function () {
      fn.apply(ctx, args);
    }, delay);
  };
}
