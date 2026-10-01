document.addEventListener("DOMContentLoaded", async function () {
  var listContainer = document.getElementById("dynamic-article-list");
  var searchInput = document.getElementById("blog-search");
  var tagCloud = document.getElementById("tag-cloud");
  if (!listContainer) return;

  var allPosts = [];
  var activeTag = null;

  function normalizeTags(tags) {
    if (Array.isArray(tags)) return tags.map(String).join(", ");
    return typeof tags === "string" && tags.trim() ? tags : "生活";
  }

  function setMessage(message, isError) {
    var paragraph = document.createElement("p");
    paragraph.className = "blog-empty-state" + (isError ? " blog-empty-state--error" : "");
    paragraph.setAttribute("role", "status");
    paragraph.setAttribute("aria-live", "polite");
    paragraph.textContent = message;
    listContainer.replaceChildren(paragraph);
  }

  function safeCover(value) {
    if (typeof value !== "string" || !value.trim()) return "";
    try {
      var url = new URL(value, window.location.href);
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
    } catch (_) {
      return "";
    }
  }

  function renderPosts(posts) {
    listContainer.replaceChildren();
    if (!posts.length) {
      setMessage("没找到相关的文章。试试其他关键词或标签吧。");
      return;
    }

    posts.forEach(function (post) {
      var card = document.createElement("article");
      card.className = "card blog-post-card fade-in";
      var cover = safeCover(post.cover);
      if (cover) {
        card.style.backgroundImage = "linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.7)), url(" + JSON.stringify(cover) + ")";
      }

      var content = document.createElement("div");
      content.className = "card-content";
      var meta = document.createElement("div");
      meta.className = "post-meta";
      var date = document.createElement("span");
      date.className = "post-date";
      date.textContent = typeof post.date === "string" ? post.date.substring(0, 10) : "";
      var tag = document.createElement("span");
      tag.className = "post-tag";
      tag.textContent = normalizeTags(post.tags).split(",")[0].trim();
      meta.append(date, tag);

      var title = document.createElement("h2");
      title.className = "post-title";
      title.textContent = typeof post.title === "string" ? post.title : "未命名文章";
      var link = document.createElement("a");
      link.className = "read-more";
      link.href = "post.html?id=" + encodeURIComponent(String(post.id));
      link.textContent = "阅读全文 →";
      content.append(meta, title, link);
      card.appendChild(content);
      listContainer.appendChild(card);
    });
  }

  function filterPosts() {
    var keyword = searchInput ? searchInput.value.trim().toLocaleLowerCase() : "";
    var filtered = allPosts.filter(function (post) {
      var tags = normalizeTags(post.tags).split(",").map(function (tag) { return tag.trim(); });
      var matchesTag = !activeTag || tags.includes(activeTag);
      var haystack = [post.title, post.description].filter(Boolean).join(" ").toLocaleLowerCase();
      return matchesTag && haystack.includes(keyword);
    });
    renderPosts(filtered);
  }

  function buildTagCloud() {
    if (!tagCloud) return;
    var counts = new Map();
    allPosts.forEach(function (post) {
      normalizeTags(post.tags).split(",").forEach(function (value) {
        var tag = value.trim();
        if (tag) counts.set(tag, (counts.get(tag) || 0) + 1);
      });
    });
    tagCloud.replaceChildren();
    Array.from(counts.entries()).sort(function (a, b) { return b[1] - a[1]; }).forEach(function (entry) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "tag-btn";
      button.textContent = entry[0] + " (" + entry[1] + ")";
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", function () {
        activeTag = activeTag === entry[0] ? null : entry[0];
        tagCloud.querySelectorAll(".tag-btn").forEach(function (item) {
          var active = item === button && activeTag === entry[0];
          item.classList.toggle("active", active);
          item.setAttribute("aria-pressed", String(active));
        });
        filterPosts();
      });
      tagCloud.appendChild(button);
    });
  }

  if (searchInput) searchInput.addEventListener("input", debounce(filterPosts, 200));

  try {
    var response = await fetch(CONFIG.POSTS_URL, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("HTTP " + response.status);
    var posts = await response.json();
    if (!Array.isArray(posts)) throw new Error("Invalid response");
    allPosts = posts.filter(function (post) { return post && post.id != null; }).map(function (post) {
      post.tags = normalizeTags(post.tags);
      return post;
    });
    if (!allPosts.length) {
      setMessage("博客已经恢复，但目前还没有发布文章。");
      return;
    }
    buildTagCloud();
    filterPosts();
  } catch (error) {
    console.error("文章加载失败:", error);
    setMessage("文章暂时无法加载，请稍后重试。", true);
  }
});
