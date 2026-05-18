document.addEventListener("DOMContentLoaded", async function () {
  var listContainer = document.getElementById("dynamic-article-list");
  var searchInput = document.getElementById("blog-search");
  if (!listContainer) return;

  var allPosts = [];

  function getPostLink(post) {
    return post.url ? post.url : "post.html?id=" + post.id;
  }

  function renderPosts(posts) {
    listContainer.innerHTML = "";
    if (posts.length === 0) {
      listContainer.innerHTML = '<p class="blog-empty-state" role="status" aria-live="polite">没找到相关的文章 😅</p>';
      return;
    }

    posts.forEach(function (post) {
      var card = document.createElement("div");
      card.className = "card blog-post-card fade-in";
      if (post.cover) {
        card.style.backgroundImage = "linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.7)), url('" + post.cover + "')";
      }
      card.innerHTML =
        '<div class="card-content">' +
        '  <div class="post-meta">' +
        '    <span class="post-date">' + escapeHtml((post.date || '').substring(0, 10)) + '</span>' +
        '    <span class="post-tag">' + escapeHtml(post.tags || '生活') + '</span>' +
        '  </div>' +
        '  <h2 class="post-title">' + escapeHtml(post.title) + '</h2>' +
        '  <a href="' + escapeHtml(getPostLink(post)) + '" class="read-more">阅读全文 <i class="ri-arrow-right-line"></i></a>' +
        '</div>';
      listContainer.appendChild(card);
    });
  }

  function normalizeTags(tags) {
    return Array.isArray(tags) ? tags.join(', ') : (tags || '生活');
  }

  async function loadPosts() {
    try {
      var response = await fetch(CONFIG.POSTS_URL);
      if (!response.ok) throw new Error("HTTP " + response.status);
      var posts = await response.json();
      posts = posts.map(function (post) {
        post.tags = normalizeTags(post.tags);
        return post;
      });
      posts.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
      return posts;
    } catch (error) {
      console.error("文章加载失败:", error);
      return [];
    }
  }

  // 标签云
  var activeTag = null;
  var tagCloud = document.getElementById("tag-cloud");

  allPosts = await loadPosts();
  if (allPosts.length === 0) {
    listContainer.innerHTML = '<p class="blog-empty-state blog-empty-state--error" role="status" aria-live="polite">当前没有可用文章，请稍后再试。</p>';
  } else {
    renderPosts(allPosts);
    buildTagCloud(allPosts);
  }

  function buildTagCloud(posts) {
    if (!tagCloud) return;
    var tags = {};
    posts.forEach(function (post) {
      (post.tags || "生活").split(",").forEach(function (t) {
        t = t.trim();
        if (t) tags[t] = (tags[t] || 0) + 1;
      });
    });

    var tagList = Object.keys(tags).sort(function (a, b) { return tags[b] - tags[a]; });
    if (tagList.length === 0) { tagCloud.style.display = "none"; return; }

    tagCloud.innerHTML = "";
    tagList.forEach(function (tag) {
      var btn = document.createElement("button");
      btn.className = "tag-btn";
      btn.textContent = tag + " (" + tags[tag] + ")";
      btn.addEventListener("click", function () {
        if (activeTag === tag) {
          activeTag = null;
          tagCloud.querySelectorAll(".tag-btn").forEach(function (b) { b.classList.remove("active"); });
          if (searchInput) searchInput.value = "";
          renderPosts(allPosts);
        } else {
          activeTag = tag;
          tagCloud.querySelectorAll(".tag-btn").forEach(function (b) { b.classList.remove("active"); });
          btn.classList.add("active");
          if (searchInput) searchInput.value = "";
          var filtered = allPosts.filter(function (post) {
            return (post.tags || "").split(",").some(function (t) { return t.trim() === tag; });
          });
          renderPosts(filtered);
        }
      });
      tagCloud.appendChild(btn);
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", debounce(function (e) {
      var keyword = e.target.value.toLowerCase();
      var source = activeTag
        ? allPosts.filter(function (post) {
            return (post.tags || "").split(",").some(function (t) { return t.trim() === activeTag; });
          })
        : allPosts;
      var filtered = source.filter(function (post) {
        return post.title.toLowerCase().includes(keyword) ||
          (post.description && post.description.toLowerCase().includes(keyword));
      });
      renderPosts(filtered);
    }, 300));
  }
});
