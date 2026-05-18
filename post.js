document.addEventListener("DOMContentLoaded", async function () {
  var urlParams = new URLSearchParams(window.location.search);
  var postId = urlParams.get("id");
  var articleTitle = document.getElementById("article-title");
  var articleMeta = document.getElementById("article-meta");
  var articleBody = document.getElementById("article-body");

  if (!postId) {
    if (articleBody) articleBody.innerHTML = "文章 ID 丢失啦！👀";
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
    if (articleBody) {
      articleBody.innerHTML = marked.parse(markdownRaw);
      buildTOC(articleBody);
    }
  } catch (err) {
    console.error(err);
    if (articleBody) articleBody.innerHTML = "加载失败，请检查 API 是否开启。";
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
