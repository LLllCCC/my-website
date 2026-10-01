document.addEventListener("DOMContentLoaded", async function () {
  var postId = new URLSearchParams(window.location.search).get("id");
  var articleTitle = document.getElementById("article-title");
  var articleBody = document.getElementById("article-body");

  function showMessage(message) {
    if (articleBody) articleBody.textContent = message;
  }

  if (!postId || !/^\d+$/.test(postId)) {
    showMessage("文章链接无效或缺少文章编号。");
    return;
  }

  try {
    var res = await fetch(CONFIG.API_BASE + "/posts/" + postId, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    var post = await res.json();

    document.title = (post.title || "博客文章") + " - Yopo";
    if (articleTitle) articleTitle.textContent = post.title || "未命名文章";
    var dateValue = typeof post.date === "string" ? post.date.substring(0, 10) : "";
    var date = document.getElementById("article-date");
    if (date) {
      date.textContent = dateValue.replace(/-/g, " / ");
      if (dateValue) date.dateTime = dateValue;
    }
    var tags = document.getElementById("article-tags");
    if (tags) {
      var tagValues = Array.isArray(post.tags) ? post.tags : String(post.tags || "").split(",");
      tagValues.map(function (tag) { return String(tag).trim(); }).filter(Boolean).forEach(function (tag) {
        var chip = document.createElement("span");
        chip.className = "article-tag";
        chip.textContent = tag;
        tags.appendChild(chip);
      });
    }

    var markdownRaw = post.content || "这篇文章还没有正文内容哦。";
    var count = (markdownRaw.match(/[\u3400-\u9fff]/g) || []).length +
      (markdownRaw.match(/[A-Za-z0-9]+/g) || []).length;
    var minutes = Math.max(1, Math.ceil(count / 450));
    var readTime = document.getElementById("article-read-time");
    if (readTime) readTime.textContent = "约 " + minutes + " 分钟阅读";

    if (articleBody && window.marked && window.DOMPurify) {
      articleBody.innerHTML = DOMPurify.sanitize(marked.parse(markdownRaw));
      buildTOC(articleBody);
      initReadingProgress();
    } else {
      showMessage("文章格式组件暂时不可用，请刷新页面重试。");
    }
  } catch (err) {
    console.error(err);
    showMessage("文章加载失败，请稍后重试；如果问题持续，请检查博客服务是否运行。");
  }
});

function buildTOC(articleBody) {
  var tocContainer = document.getElementById("article-toc");
  if (!tocContainer) return;
  var headings = articleBody.querySelectorAll("h2, h3");
  if (headings.length < 2) {
    tocContainer.hidden = true;
    return;
  }
  headings.forEach(function (heading, index) {
    if (!heading.id) heading.id = "heading-" + index;
  });
  var title = document.createElement("div");
  title.className = "article-toc-title";
  title.textContent = "本文目录";
  tocContainer.appendChild(title);
  var list = document.createElement("ul");
  list.className = "article-toc-list";
  headings.forEach(function (heading) {
    var item = document.createElement("li");
    item.className = "article-toc-item" + (heading.tagName === "H3" ? " article-toc-item--sub" : "");
    var link = document.createElement("a");
    link.href = "#" + heading.id;
    link.textContent = heading.textContent;
    item.appendChild(link);
    list.appendChild(item);
  });
  tocContainer.append(title, list);
}

function initReadingProgress() {
  var bar = document.getElementById("reading-progress-bar");
  if (!bar) return;
  var scheduled = false;
  function update() {
    var root = document.documentElement;
    var range = root.scrollHeight - window.innerHeight;
    var amount = range > 0 ? Math.min(100, Math.max(0, (window.scrollY / range) * 100)) : 0;
    bar.style.width = amount + "%";
    scheduled = false;
  }
  window.addEventListener("scroll", function () {
    if (!scheduled) {
      scheduled = true;
      window.requestAnimationFrame(update);
    }
  }, { passive: true });
  update();
}
