// 短记：只读时间线。发布与删除在 /admin.html，这里只展示。
// 视觉复用 post.css 的评论样式类，另加少量时间线专属样式（css/blog.css 的 shorts-*）。
import { CONFIG, formatDateTime } from "./config.js?v=56";

const API_URL = CONFIG.API_BASE + "/shorts";

document.addEventListener("DOMContentLoaded", function () {
  const list = document.getElementById("shorts-list");
  const loading = document.getElementById("shorts-loading");
  const countBadge = document.getElementById("shorts-count");
  if (!list || !loading) return;

  load();

  async function load() {
    try {
      const response = await fetch(API_URL, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const items = await response.json();
      render(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error(err);
      loading.textContent = "短记暂时读取失败，稍后刷新页面即可。";
      loading.hidden = false;
    }
  }

  function render(items) {
    loading.hidden = true;
    if (countBadge) countBadge.textContent = String(items.length);
    list.replaceChildren();
    if (!items.length) {
      const empty = document.createElement("li");
      empty.className = "comment-item";
      empty.textContent = "还没有短记。";
      list.appendChild(empty);
      return;
    }
    items.forEach(function (item) {
      const row = document.createElement("li");
      row.className = "comment-item shorts-item";

      const head = document.createElement("div");
      head.className = "comment-item-head";
      const label = document.createElement("span");
      label.className = "comment-item-name";
      label.textContent = "短记";
      const time = document.createElement("time");
      time.className = "comment-item-time";
      time.dateTime = item.created_at || "";
      time.textContent = formatDateTime(item.created_at);
      head.append(label, time);

      const body = document.createElement("p");
      body.className = "comment-item-body";
      body.textContent = item.content || "";

      row.append(head, body);
      list.appendChild(row);
    });
  }
});
