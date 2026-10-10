// 博客列表页：搜索、标签云、文章卡片。
// 搜索分两级：短关键词走本地（标题/摘要/标签，即时响应），
// 关键词达到长度阈值时再调 /api/posts/search 取正文命中的结果，两级合并去重。
import { CONFIG, safeHttpUrl } from "./config.js?v=37";

// 关键词到这个长度才发网络请求：更短的词本地就能筛完，省一次往返。
const FULL_TEXT_MIN_LENGTH = 2;

document.addEventListener("DOMContentLoaded", async function () {
  const listContainer = document.getElementById("dynamic-article-list");
  const searchInput = document.getElementById("blog-search");
  const tagCloud = document.getElementById("tag-cloud");
  const totalCount = document.getElementById("blog-total-count");
  const resultCount = document.getElementById("blog-result-count");
  if (!listContainer) return;

  let allPosts = [];
  let activeTag = null;
  let fullTextSnippets = new Map();
  let fullTextTimer = null;
  const chronologicalRank = new Map();

  function normalizeTags(tags) {
    if (Array.isArray(tags)) return tags.map(String).join(", ");
    return typeof tags === "string" && tags.trim() ? tags : "生活";
  }

  function setMessage(message, isError) {
    const paragraph = document.createElement("p");
    paragraph.className = "blog-empty-state" + (isError ? " blog-empty-state--error" : "");
    paragraph.setAttribute("role", "status");
    paragraph.textContent = message;
    listContainer.replaceChildren(paragraph);
    if (resultCount) resultCount.textContent = isError ? "暂时无法连接" : "暂无文章";
  }

  function renderPosts(posts) {
    listContainer.replaceChildren();
    if (!posts.length) {
      const empty = document.createElement("p");
      empty.className = "blog-empty-state";
      empty.textContent = "没有找到匹配的文章。换个关键词或清除标签试试。";
      listContainer.appendChild(empty);
      return;
    }

    posts.forEach(function (post) {
      const card = document.createElement("article");
      card.className = "card blog-post-card";
      card.dataset.index = String(chronologicalRank.get(String(post.id)) || 0).padStart(2, "0");
      const cover = safeHttpUrl(post.cover);
      if (cover) {
        card.style.backgroundImage =
          "linear-gradient(145deg, rgba(0,0,0,.18), rgba(0,0,0,.72)), url(" +
          JSON.stringify(cover) +
          ")";
        card.classList.add("blog-post-card--cover");
      }

      const content = document.createElement("div");
      content.className = "blog-post-content";
      const meta = document.createElement("div");
      meta.className = "blog-post-meta";

      const date = document.createElement("time");
      date.className = "blog-post-date";
      const rawDate = typeof post.date === "string" ? post.date.substring(0, 10) : "";
      date.textContent = rawDate.replace(/-/g, " / ");
      if (rawDate) date.dateTime = rawDate;

      const tag = document.createElement("span");
      tag.className = "blog-post-tag";
      tag.textContent = normalizeTags(post.tags).split(",")[0].trim();
      meta.append(date, tag);

      const commentCount = Number(post.comment_count) || 0;
      if (commentCount > 0) {
        const comments = document.createElement("span");
        comments.className = "blog-post-comments";
        comments.textContent = "评论 " + commentCount;
        comments.title = "已有 " + commentCount + " 条通过审核的评论";
        meta.appendChild(comments);
      }

      const title = document.createElement("h2");
      title.className = "blog-post-title";
      title.textContent =
        typeof post.title === "string" && post.title.trim() ? post.title : "未命名文章";

      const excerpt = document.createElement("p");
      excerpt.className = "blog-post-excerpt";
      const summary = typeof post.description === "string" ? post.description.trim() : "";
      // 有正文命中片段时优先显示它，让访客看出为什么匹配上。
      const snippet = fullTextSnippets.get(String(post.id));
      const text = snippet || summary;
      excerpt.textContent =
        text && text !== title.textContent ? text : "一段关于代码与日常的记录，点开继续阅读。";

      const link = document.createElement("a");
      link.className = "blog-post-link";
      link.href = "post.html?id=" + encodeURIComponent(String(post.id));
      link.setAttribute("aria-label", "阅读全文：" + title.textContent);
      link.textContent = "阅读全文";

      content.append(meta, title, excerpt, link);
      card.appendChild(content);
      listContainer.appendChild(card);
    });
  }

  function filterPosts() {
    const keyword = searchInput ? searchInput.value.trim().toLocaleLowerCase() : "";
    const filtered = allPosts.filter(function (post) {
      const tags = normalizeTags(post.tags)
        .split(",")
        .map(function (tag) {
          return tag.trim();
        });
      const matchesTag = !activeTag || tags.includes(activeTag);
      // 本地匹配标题、摘要、标签，以及后端已经确认在正文里命中的文章。
      const haystack = [post.title, post.description].filter(Boolean).join(" ").toLocaleLowerCase();
      const matchesKeyword =
        !keyword || haystack.includes(keyword) || fullTextSnippets.has(String(post.id));
      return matchesTag && matchesKeyword;
    });

    if (resultCount) {
      const scope = keyword || activeTag;
      resultCount.textContent = scope
        ? "找到 " + filtered.length + " 篇"
        : "最近更新 · " + filtered.length + " 篇";
    }
    renderPosts(filtered);
  }

  // 关键词达到阈值才去后端搜正文。用序号打断，只认最后一次输入的结果，
  // 避免慢的旧请求回来后覆盖新关键词的命中集合。
  let searchSeq = 0;
  function requestFullText(keyword) {
    if (keyword.length < FULL_TEXT_MIN_LENGTH) {
      fullTextSnippets = new Map();
      return;
    }
    const seq = ++searchSeq;
    const url = CONFIG.API_BASE + "/posts/search?q=" + encodeURIComponent(keyword);
    fetch(url, { headers: { Accept: "application/json" } })
      .then(function (response) {
        return response.ok ? response.json() : [];
      })
      .then(function (rows) {
        if (seq !== searchSeq || !Array.isArray(rows)) return;
        const next = new Map();
        rows.forEach(function (row) {
          if (row && row.id != null) next.set(String(row.id), row.snippet || "");
        });
        fullTextSnippets = next;
        filterPosts();
      })
      .catch(function () {
        // 全文搜索失败就退回纯本地结果，不打扰用户。
        if (seq === searchSeq) filterPosts();
      });
  }

  function scheduleFullText(keyword) {
    clearTimeout(fullTextTimer);
    fullTextTimer = setTimeout(function () {
      requestFullText(keyword);
    }, 280);
  }

  function buildTagCloud() {
    if (!tagCloud) return;
    const counts = new Map();
    allPosts.forEach(function (post) {
      normalizeTags(post.tags)
        .split(",")
        .forEach(function (value) {
          const tag = value.trim();
          if (tag) counts.set(tag, (counts.get(tag) || 0) + 1);
        });
    });

    tagCloud.replaceChildren();
    const allButton = document.createElement("button");
    allButton.type = "button";
    allButton.className = "tag-btn is-active";
    allButton.textContent = "全部";
    allButton.setAttribute("aria-pressed", "true");
    allButton.addEventListener("click", function () {
      activeTag = null;
      if (searchInput) searchInput.value = "";
      // 搜索框被清空了，全文命中的那批文章不该再留在结果里。
      fullTextSnippets = new Map();
      searchSeq += 1;
      tagCloud.querySelectorAll(".tag-btn").forEach(function (button) {
        const active = button === allButton;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });
      filterPosts();
    });
    tagCloud.appendChild(allButton);

    Array.from(counts.entries())
      .sort(function (a, b) {
        return b[1] - a[1];
      })
      .forEach(function (entry) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "tag-btn";
        button.textContent = entry[0] + " " + String(entry[1]).padStart(2, "0");
        button.setAttribute("aria-pressed", "false");
        button.addEventListener("click", function () {
          activeTag = activeTag === entry[0] ? null : entry[0];
          tagCloud.querySelectorAll(".tag-btn").forEach(function (item) {
            const active = activeTag !== null && item === button;
            item.classList.toggle("is-active", active);
            item.setAttribute("aria-pressed", String(active));
          });
          if (!activeTag) {
            allButton.classList.add("is-active");
            allButton.setAttribute("aria-pressed", "true");
          }
          filterPosts();
        });
        tagCloud.appendChild(button);
      });
  }

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      const keyword = searchInput.value.trim().toLocaleLowerCase();
      // 先出本地结果，再去要正文命中，界面不等网络。
      filterPosts();
      scheduleFullText(keyword);
    });
  }

  try {
    const response = await fetch(CONFIG.POSTS_URL, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const posts = await response.json();
    if (!Array.isArray(posts)) throw new Error("Invalid response");
    allPosts = posts
      .filter(function (post) {
        return post && post.id != null;
      })
      .map(function (post) {
        post.tags = normalizeTags(post.tags);
        return post;
      });
    allPosts
      .slice()
      .sort(function (a, b) {
        const timeA = Date.parse(a.date || "") || 0;
        const timeB = Date.parse(b.date || "") || 0;
        return timeA - timeB || Number(a.id) - Number(b.id);
      })
      .forEach(function (post, index) {
        chronologicalRank.set(String(post.id), index + 1);
      });

    if (totalCount) totalCount.textContent = String(allPosts.length).padStart(2, "0");
    if (!allPosts.length) {
      setMessage("这里还没有文章，发布第一篇记录吧。");
      return;
    }
    buildTagCloud();
    filterPosts();
  } catch (error) {
    console.error("文章加载失败:", error);
    setMessage("文章暂时无法加载，请稍后再试。", true);
  }
});
