document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get("id");
  const articleTitle = document.getElementById("article-title");
  const articleMeta = document.getElementById("article-meta");
  const articleBody = document.getElementById("article-body");

  if (!postId) {
    if (articleBody) {
      articleBody.innerHTML = "文章 ID 丢失啦！👀";
    }
    return;
  }

  try {
    const res = await fetch(`https://yopoo.888431.xyz/api/posts/${postId}`);
    const post = await res.json();

    document.title = post.title;
    if (articleTitle) articleTitle.textContent = post.title;
    if (articleMeta) articleMeta.textContent = `${post.date} · ${post.tags}`;

    const markdownRaw = post.content || "这篇文章还没有正文内容哦。";
    if (articleBody) {
      articleBody.innerHTML = marked.parse(markdownRaw);
    }
  } catch (err) {
    console.error(err);
    if (articleBody) {
      articleBody.innerHTML = "加载失败，请检查 API 是否开启。";
    }
  }
});