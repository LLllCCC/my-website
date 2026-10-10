// 标签页：默认列出全部文章 + 顶部标签云；带 ?t=xxx 时只列该标签的文章。
//
// 存在的意义：博客页的标签只能在页面上点着筛，URL 不跟着变——既分享不出去，
// 搜索引擎也看不到。这个页面让每个标签都有一个可分享、可被收录的独立链接。
//
// 数据来自现有 /api/posts，纯前端聚合，不额外请求后端。
import { CONFIG, debounce } from "./config.js?v=43";
import { tagValuesOf, dateKeyOf, matchesKeyword, buildPostRow } from "./postList.js?v=43";

document.addEventListener("DOMContentLoaded", async function () {
  const cloudBox = document.getElementById("tag-cloud");
  const listBox = document.getElementById("tag-posts");
  const searchInput = document.getElementById("tag-search");
  const resultCount = document.getElementById("tag-result-count");
  const totalTags = document.getElementById("tag-total-count");
  const totalPosts = document.getElementById("tag-post-count");
  const currentLabel = document.getElementById("tag-current-label");
  const currentCount = document.getElementById("tag-current-count");
  if (!cloudBox || !listBox) return;

  let allPosts = [];
  let activeTag = readTagFromUrl();

  function readTagFromUrl() {
    try {
      return (new URLSearchParams(window.location.search).get("t") || "").trim();
    } catch (_) {
      return "";
    }
  }

  function setMessage(message, isError) {
    const paragraph = document.createElement("p");
    paragraph.className = "blog-empty-state" + (isError ? " blog-empty-state--error" : "");
    paragraph.setAttribute("role", "status");
    paragraph.textContent = message;
    listBox.replaceChildren(paragraph);
  }

  function tagIndex() {
    const index = new Map();
    allPosts.forEach(function (post) {
      tagValuesOf(post).forEach(function (tag) {
        index.set(tag, (index.get(tag) || 0) + 1);
      });
    });
    return index;
  }

  function renderCloud() {
    const index = tagIndex();
    const entries = Array.from(index.entries()).sort(function (a, b) {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0], "zh");
    });

    cloudBox.replaceChildren();

    const makeChip = function (label, value, count) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "tag-chip" + (value === activeTag ? " is-active" : "");
      chip.dataset.tag = value;
      chip.setAttribute("aria-pressed", String(value === activeTag));
      chip.textContent = label;
      if (count != null) {
        const badge = document.createElement("span");
        badge.className = "tag-chip-count";
        badge.textContent = String(count).padStart(2, "0");
        chip.appendChild(badge);
      }
      chip.addEventListener("click", function () {
        selectTag(value, true);
      });
      return chip;
    };

    cloudBox.appendChild(makeChip("全部", "", allPosts.length));
    entries.forEach(function (entry) {
      cloudBox.appendChild(makeChip(entry[0], entry[0], entry[1]));
    });

    if (totalTags) totalTags.textContent = String(entries.length).padStart(2, "0");
  }

  function renderList() {
    const keyword = searchInput ? searchInput.value.trim().toLocaleLowerCase() : "";

    const inTag = activeTag
      ? allPosts.filter(function (post) {
          return tagValuesOf(post).indexOf(activeTag) !== -1;
        })
      : allPosts.slice();

    const visible = inTag.filter(function (post) {
      return matchesKeyword(post, keyword);
    });

    // 新到旧：标签页是"这个标签写过什么"，从最近往前读最自然
    visible.sort(function (a, b) {
      const timeA = Date.parse(dateKeyOf(a) + "T00:00:00") || 0;
      const timeB = Date.parse(dateKeyOf(b) + "T00:00:00") || 0;
      return timeB - timeA || Number(b.id) - Number(a.id);
    });

    listBox.replaceChildren();

    if (!visible.length) {
      setMessage(
        activeTag || keyword
          ? "这个筛选下没有文章，换个标签或关键词看看。"
          : "这里还没有文章，发布第一篇记录吧。"
      );
      if (resultCount) {
        resultCount.textContent = allPosts.length ? "没有匹配的文章" : "暂无文章";
      }
    } else {
      const section = document.createElement("section");
      section.className = "archive-group";

      const heading = document.createElement("h2");
      heading.className = "archive-group-title";
      heading.textContent = activeTag || "全部文章";

      const count = document.createElement("span");
      count.className = "archive-group-count";
      count.textContent = String(visible.length).padStart(2, "0") + " 篇";

      const list = document.createElement("ul");
      list.className = "archive-list";
      visible.forEach(function (post) {
        list.appendChild(buildPostRow(post, { excludeTag: activeTag }));
      });

      section.append(heading, count, list);
      listBox.appendChild(section);

      if (resultCount) {
        resultCount.textContent =
          (keyword ? "找到 " : "共 ") +
          visible.length +
          " 篇" +
          (activeTag ? " · 标签「" + activeTag + "」" : "");
      }
    }

    if (currentLabel) currentLabel.textContent = activeTag ? "标签：" + activeTag : "全部文章";
    if (currentCount) currentCount.textContent = String(visible.length).padStart(2, "0");
    document.title = activeTag ? "标签：" + activeTag + " - Yopo" : "标签 - Yopo";
  }

  // 切换标签时同步 URL：分享得出去，浏览器前进/后退也能用。
  function selectTag(tag, pushHistory) {
    activeTag = tag || readTagFromUrl();
    if (pushHistory) {
      const url = tag ? "?t=" + encodeURIComponent(tag) : window.location.pathname;
      try {
        window.history.pushState({ tag: tag }, "", url);
      } catch (_) {
        /* 某些环境不允许改 URL，退化成纯前端筛选即可 */
      }
    }
    renderCloud();
    renderList();
  }

  if (searchInput) searchInput.addEventListener("input", debounce(renderList, 180));

  window.addEventListener("popstate", function () {
    selectTag(readTagFromUrl(), false);
  });

  try {
    const response = await fetch(CONFIG.POSTS_URL, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const posts = await response.json();
    if (!Array.isArray(posts)) throw new Error("Invalid response");

    allPosts = posts.filter(function (post) {
      return post && post.id != null;
    });

    if (totalPosts) totalPosts.textContent = String(allPosts.length).padStart(2, "0");

    // URL 里的标签可能在文章删改后已经不存在了，纠正回「全部」
    if (activeTag && !tagIndex().has(activeTag)) activeTag = "";

    if (!allPosts.length) {
      renderCloud();
      setMessage("这里还没有文章，发布第一篇记录吧。");
      if (resultCount) resultCount.textContent = "暂无文章";
      return;
    }

    renderCloud();
    renderList();
  } catch (error) {
    console.error("标签页加载失败:", error);
    setMessage("文章暂时无法加载，请稍后再试。", true);
    if (resultCount) resultCount.textContent = "暂时无法连接";
  }
});
