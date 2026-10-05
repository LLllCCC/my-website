// 评论区：免登录留言（昵称自动生成）、表情回应、排序、两层楼中楼。
// 从 post.js 拆出；文章渲染逻辑不要写进这个文件。
import { CONFIG, formatDateTime } from "./config.js?v=29";
import { renderCommentMarkdown } from "./comment-markdown.js?v=29";

const COMMENT_NICKNAME_KEY = "yopo-comment-nickname";
const COMMENT_NICKNAME_WORDS = {
  adjectives: ["青柠", "晚风", "雾蓝", "海盐", "雪松", "薄荷", "琥珀", "青苔", "远山", "微光"],
  nouns: ["水母", "信天翁", "柴犬", "风铃", "苔原", "云豹", "刺猬", "灯塔", "游隼", "小鹿"],
};

function randomNickname() {
  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }
  return (
    pick(COMMENT_NICKNAME_WORDS.adjectives) +
    pick(COMMENT_NICKNAME_WORDS.nouns) +
    String(100 + Math.floor(Math.random() * 900))
  );
}

function rememberedNickname() {
  try {
    const saved = localStorage.getItem(COMMENT_NICKNAME_KEY);
    const value = typeof saved === "string" ? saved.trim() : "";
    return value && [...value].length <= 30 ? value : "";
  } catch (_) {
    return "";
  }
}

function rememberNickname(value) {
  try {
    localStorage.setItem(COMMENT_NICKNAME_KEY, value);
  } catch (_) {}
}

const COMMENT_REACTION_EMOJIS = ["\u{1F44D}", "\u2764\uFE0F", "\u{1F604}", "\u{1F525}"];
const COMMENT_VISITOR_KEY = "yopo-comment-visitor";
const COMMENT_REACTION_KEY = "yopo-comment-reactions";

function randomVisitorId() {
  return window.crypto && window.crypto.randomUUID
    ? window.crypto.randomUUID()
    : String(Date.now()) + "-" + Math.random().toString(16).slice(2);
}

function visitorId() {
  try {
    const saved = localStorage.getItem(COMMENT_VISITOR_KEY);
    if (typeof saved === "string" && /^[0-9a-zA-Z-]{8,64}$/.test(saved)) return saved;
    const created = randomVisitorId();
    localStorage.setItem(COMMENT_VISITOR_KEY, created);
    return created;
  } catch (_) {
    return randomVisitorId();
  }
}

function tappedReactions() {
  try {
    const list = JSON.parse(localStorage.getItem(COMMENT_REACTION_KEY) || "[]");
    return new Set(Array.isArray(list) ? list.filter((item) => typeof item === "string") : []);
  } catch (_) {
    return new Set();
  }
}

const COMMENT_SORTS = [
  { key: "old", label: "最早" },
  { key: "new", label: "最新" },
  { key: "hot", label: "最热" },
];
const COMMENT_SORT_KEY = "yopo-comment-sort";

function savedCommentSort() {
  try {
    const saved = localStorage.getItem(COMMENT_SORT_KEY);
    return COMMENT_SORTS.some((item) => item.key === saved) ? saved : "old";
  } catch (_) {
    return "old";
  }
}

function rememberCommentSort(value) {
  try {
    localStorage.setItem(COMMENT_SORT_KEY, value);
  } catch (_) {}
}

export function initComments(postId) {
  const form = document.getElementById("comment-form");
  const nicknameField = document.getElementById("comment-nickname");
  const contentField = document.getElementById("comment-content");
  const statusField = document.getElementById("comment-status");
  const list = document.getElementById("comment-list");
  const countField = document.getElementById("comments-count");
  const submitButton = document.getElementById("comment-submit");
  const commentsUrl = CONFIG.API_BASE + "/posts/" + encodeURIComponent(postId) + "/comments";
  const sortBox = document.getElementById("comment-sort");
  if (!form || !list || !nicknameField || !contentField) return;

  let sort = savedCommentSort();
  nicknameField.value = rememberedNickname() || randomNickname();

  function setStatus(message, isError) {
    if (!statusField) return;
    statusField.textContent = message || "";
    statusField.classList.toggle("is-error", Boolean(isError));
  }

  function appendListMessage(message) {
    list.replaceChildren();
    const row = document.createElement("li");
    row.className = "comment-item comment-item--notice";
    row.textContent = message;
    list.appendChild(row);
  }

  const visitor = visitorId();
  const tapped = tappedReactions();

  function saveTapped() {
    try {
      localStorage.setItem(COMMENT_REACTION_KEY, JSON.stringify(Array.from(tapped).slice(-500)));
    } catch (_) {}
  }

  const replyingBox = document.getElementById("comment-replying");
  const replyingText = document.getElementById("comment-replying-text");
  const replyingCancel = document.getElementById("comment-replying-cancel");
  let replyingTo = null;

  function setReplying(item) {
    replyingTo = item;
    if (!replyingBox) return;
    replyingBox.hidden = !item;
    if (item && replyingText)
      replyingText.textContent = "正在回复 @" + (item.nickname || "匿名访客");
  }

  function startReply(item) {
    setReplying(replyingTo && replyingTo.id === item.id ? null : item);
    if (contentField) contentField.focus();
  }

  if (replyingCancel) {
    replyingCancel.addEventListener("click", function () {
      setReplying(null);
      if (contentField) contentField.focus();
    });
  }

  async function respond(item, emoji, button) {
    if (button.classList.contains("is-busy")) return;
    button.classList.add("is-busy");
    try {
      const res = await fetch(
        CONFIG.API_BASE + "/comments/" + encodeURIComponent(item.id) + "/reactions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ emoji: emoji, visitor: visitor }),
        }
      );
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      item.reactions = Array.isArray(data.reactions) ? data.reactions : [];
      if (data.active) tapped.add(item.id + "|" + emoji);
      else tapped.delete(item.id + "|" + emoji);
      saveTapped();
      button.parentElement.replaceWith(reactionRow(item));
    } catch (err) {
      console.error("表情回应失败:", err);
      button.classList.remove("is-busy");
    }
  }

  function reactionRow(item) {
    const row = document.createElement("div");
    row.className = "comment-reactions";
    const counts = new Map();
    (item.reactions || []).forEach(function (reaction) {
      counts.set(reaction.emoji, Number(reaction.count) || 0);
    });
    COMMENT_REACTION_EMOJIS.forEach(function (emoji) {
      const count = counts.get(emoji) || 0;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "comment-reaction";
      button.textContent = emoji + (count ? " " + count : "");
      button.setAttribute("aria-label", "用" + emoji + "回应，目前 " + count + " 个");
      if (tapped.has(item.id + "|" + emoji)) button.classList.add("is-tapped");
      button.addEventListener("click", function () {
        respond(item, emoji, button);
      });
      row.appendChild(button);
    });
    const reply = document.createElement("button");
    reply.type = "button";
    reply.className = "comment-reply-btn";
    reply.textContent = "回复";
    reply.addEventListener("click", function () {
      startReply(item);
    });
    row.appendChild(reply);
    return row;
  }

  function render(items) {
    list.replaceChildren();
    if (countField) countField.textContent = items.length ? " · " + items.length + " 条" : "";
    if (!items.length) {
      appendListMessage("还没有留言，可以说两句。");
      return;
    }
    items.forEach(function (item) {
      const row = document.createElement("li");
      row.className = item.parent_id ? "comment-item comment-item--reply" : "comment-item";
      const head = document.createElement("div");
      head.className = "comment-item-head";
      const name = document.createElement("span");
      name.className = "comment-item-name";
      name.textContent = item.nickname || "匿名访客";
      const time = document.createElement("time");
      time.className = "comment-item-time";
      time.textContent = formatDateTime(item.created_at);
      head.append(name, time);
      if (item.parent_id && item.reply_to) {
        const replyTo = document.createElement("span");
        replyTo.className = "comment-item-replyto";
        replyTo.textContent = "回复 @" + item.reply_to;
        head.appendChild(replyTo);
      }
      row.append(head, renderCommentMarkdown(item.content || "", document), reactionRow(item));
      list.appendChild(row);
    });
  }

  async function load() {
    try {
      const res = await fetch(commentsUrl + "?sort=" + encodeURIComponent(sort), {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const items = await res.json();
      render(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error(err);
      appendListMessage("评论暂时读取失败，稍后刷新页面即可。");
    }
  }

  function renderSortButtons() {
    if (!sortBox) return;
    sortBox.replaceChildren();
    COMMENT_SORTS.forEach(function (option) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "comment-sort-btn";
      button.dataset.sort = option.key;
      button.textContent = option.label;
      if (option.key === sort) {
        button.classList.add("is-active");
        button.setAttribute("aria-disabled", "true");
      }
      button.addEventListener("click", function () {
        if (sort === option.key) return;
        sort = option.key;
        rememberCommentSort(sort);
        renderSortButtons();
        load();
      });
      sortBox.appendChild(button);
    });
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    const nickname = nicknameField.value.trim();
    const content = contentField.value.trim();
    if (!nickname || !content) {
      setStatus("昵称和留言都要填写。", true);
      return;
    }

    rememberNickname(nickname);
    submitButton.disabled = true;
    setStatus("正在提交…", false);
    try {
      const res = await fetch(commentsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          nickname: nickname,
          content: content,
          parent_id: replyingTo ? replyingTo.id : null,
          website: form.website ? form.website.value : "",
        }),
      });
      if (res.status === 429) throw Object.assign(new Error("限流"), { status: 429 });
      if (res.status === 400) throw Object.assign(new Error("内容不合规"), { status: 400 });
      if (!res.ok) throw new Error("HTTP " + res.status);
      contentField.value = "";
      setStatus(
        replyingTo
          ? "已提交，通过审核后会显示在那条留言下面。"
          : "已提交，通过审核后会显示在这里。",
        false
      );
      setReplying(null);
    } catch (err) {
      console.error(err);
      setStatus(
        err.status === 429
          ? "留言太快了，请稍后再试。"
          : err.status === 400
            ? "留言太长或内容为空，改一下再提交。"
            : "提交失败，博客服务可能暂时不可用。",
        true
      );
    } finally {
      submitButton.disabled = false;
    }
  });

  renderSortButtons();
  load();
}
