// 全站共享配置与工具。页面脚本统一用 import 引用本模块；
// import 路径和 HTML 里的引用一样都带 ?v= 版本号，改动后全站一起 +1。
export const CONFIG = {
  API_BASE: "/api",
  POSTS_URL: "/api/posts",
  SITE_NAME: "Yopo",
  SITE_URL: "https://yopoo.888431.xyz",
};

// Toast 通知工具
export function showToast(message) {
  const toast = document.createElement("div");
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
export function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// 评论时间戳两处共用：文章页留言列表 + 后台审核列表。
// 无法解析时原样返回，调用方拿到的永远是字符串。
export function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return String(value);
  const pad = (part) => String(part).padStart(2, "0");
  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate()) +
    " " +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes())
  );
}

// 只接受 http(s) URL（相对路径按当前页面解析），其余一律返回空串，
// 防止 javascript: 之类的协议被塞进 img/href。封面和文章内图片共用。
export function safeHttpUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value.trim(), window.location.href);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch (_) {
    return "";
  }
}
