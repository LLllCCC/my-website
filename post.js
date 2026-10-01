document.addEventListener("DOMContentLoaded", async function () {
  var urlParams = new URLSearchParams(window.location.search);
  var postId = urlParams.get("id");
  var articleTitle = document.getElementById("article-title");
  var articleMeta = document.getElementById("article-meta");
  var articleBody = document.getElementById("article-body");

  function showMessage(message) {
    if (articleBody) articleBody.textContent = message;
  }

  if (!postId || !/^\d+$/.test(postId)) {
    showMessage("文章链接无效或缺少文章编号。");
    return;
  }

  try {
    var res = await fetch(CONFIG.API_BASE + "/posts/" + postId);
    if (!res.ok) throw new Error("HTTP " + res.status);
    var post = await res.json();

    document.title = post.title;
    if (articleTitle) articleTitle.textContent = post.title;
    if (articleMeta) articleMeta.textContent = (post.date || "").substring(0, 10) + " · " + post.tags;

    var markdownRaw = post.content || "这篇文章还没有正文内容哦。";
    if (articleBody && window.marked && window.DOMPurify) {
      articleBody.innerHTML = DOMPurify.sanitize(marked.parse(markdownRaw));
      buildTOC(articleBody);
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
    tocContainer.style.display = "none";
    return;
  }

  headings.forEach(function (h, i) {
    if (!h.id) h.id = "heading-" + i;
  });

  var title = document.createElement("div");
  title.className = "article-toc-title";
  title.textContent = "目录";
  tocContainer.appendChild(title);

  var list = document.createElement("ul");
  list.className = "article-toc-list";

  headings.forEach(function (h) {
    var li = document.createElement("li");
    li.className = "article-toc-item" + (h.tagName === "H3" ? " article-toc-item--sub" : "");
    var a = document.createElement("a");
    a.href = "#" + h.id;
    a.textContent = h.textContent;
    a.addEventListener("click", function (e) {
      e.preventDefault();
      var target = document.getElementById(h.id);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    li.appendChild(a);
    list.appendChild(li);
  });

  tocContainer.appendChild(list);
}
