// 留言板：列表 + 提交。安全模型与评论共用（蜜罐、先审后发、同一访客昵称）。
// 视觉与结构复用 post.css 的评论样式类，这里不写新样式。
import { CONFIG, formatDateTime } from "./config.js?v=55";
import { rememberedNickname, rememberNickname, randomNickname } from "./comments.js?v=55";

const API_URL = CONFIG.API_BASE + "/guestbook";

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("guestbook-form");
  const list = document.getElementById("guestbook-list");
  const loading = document.getElementById("guestbook-loading");
  const status = document.getElementById("guestbook-status");
  const submitBtn = document.getElementById("guestbook-submit");
  const countBadge = document.getElementById("guestbook-count");
  const nicknameField = document.getElementById("guestbook-nickname");
  const contentField = document.getElementById("guestbook-content");
  if (!form || !list || !nicknameField || !contentField) return;

  // 与评论共用同一个昵称记忆：评论里改过昵称，这里自动跟上。
  nicknameField.value = rememberedNickname() || randomNickname();

  load();

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    const nickname = nicknameField.value.trim();
    const content = contentField.value.trim();
    if (!nickname || !content) {
      showStatus("昵称和留言都要有内容", true);
      return;
    }
    rememberNickname(nickname);

    submitBtn.disabled = true;
    showStatus("提交中…");
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          nickname: nickname,
          content: content,
          website: form.elements.website ? form.elements.website.value : "",
        }),
      });
      if (response.status === 429) {
        showStatus("发得有点快，歇一会儿再来", true);
        return;
      }
      if (!response.ok) throw new Error("HTTP " + response.status);
      // 先审后发：成功也不把这条塞进列表，只提示等待审核。
      contentField.value = "";
      showStatus("已提交，审核通过后就会显示出来");
    } catch (err) {
      console.error(err);
      showStatus("提交失败，稍后再试", true);
    } finally {
      submitBtn.disabled = false;
    }
  });

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
      loading.textContent = "留言暂时读取失败，稍后刷新页面即可。";
      loading.hidden = false;
    }
  }

  function render(items) {
    loading.hidden = true;
    if (countBadge) countBadge.textContent = String(items.length);
    if (!items.length) {
      list.innerHTML = "";
      const empty = document.createElement("li");
      empty.className = "comment-item";
      empty.textContent = "还没有留言，来说第一句。";
      list.appendChild(empty);
      return;
    }
    const fragment = document.createDocumentFragment();
    items.forEach(function (item) {
      const row = document.createElement("li");
      row.className = "comment-item";

      const head = document.createElement("div");
      head.className = "comment-item-head";
      const name = document.createElement("span");
      name.className = "comment-item-name";
      name.textContent = item.nickname || "匿名访客";
      const time = document.createElement("time");
      time.className = "comment-item-time";
      time.textContent = formatDateTime(item.created_at);
      head.append(name, time);

      const body = document.createElement("p");
      body.className = "comment-item-body";
      body.textContent = item.content || "";

      row.append(head, body);
      fragment.appendChild(row);
    });
    list.replaceChildren(fragment);
  }

  function showStatus(text, isError) {
    if (!status) return;
    status.textContent = text;
    status.classList.toggle("is-error", Boolean(isError));
  }
});
