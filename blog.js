document.addEventListener("DOMContentLoaded", async function() {
  const listContainer = document.getElementById("dynamic-article-list");
  const searchInput = document.getElementById("blog-search");
  const API_URL = "https://yopoo.888431.xyz/api/posts";
  if (!listContainer) return;

  let allPosts = []; // 用来存放原始数据

  // 1. 获取并渲染数据的函数
  function renderPosts(posts) {
    listContainer.innerHTML = "";
    if (posts.length === 0) {
      listContainer.innerHTML = `<p class="blog-empty-state" role="status" aria-live="polite">没找到相关的文章 😅</p>`;
      return;
    }

    posts.forEach((post) => {
      const card = document.createElement("div");
      card.className = "card blog-post-card fade-in";
      if (post.cover) {
        card.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.7)), url('${post.cover}')`;
      }
      card.innerHTML = `
          <div class="card-content">
              <div class="post-meta">
                  <span class="post-date">${post.date}</span>
                  <span class="post-tag">${post.tags || '生活'}</span>
              </div>
              <h2 class="post-title">${post.title}</h2>
              <a href="post.html?id=${post.id}" class="read-more">阅读全文 <i class="ri-arrow-right-line"></i></a>
          </div>
      `;
      listContainer.appendChild(card);
    });
  }

  // 2. 初始化加载
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    allPosts = await response.json();
    allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
    renderPosts(allPosts);
  } catch (error) {
    if (listContainer) {
      listContainer.innerHTML = `<p class="blog-empty-state blog-empty-state--error" role="status" aria-live="polite">加载失败，请检查 API 状态。</p>`;
    }
    console.error('博客加载失败:', error);
  }

  // 3. 🌟 搜索监听逻辑
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const keyword = e.target.value.toLowerCase();
      const filtered = allPosts.filter(
        (post) =>
          post.title.toLowerCase().includes(keyword) ||
          (post.description && post.description.toLowerCase().includes(keyword)),
      );
      renderPosts(filtered);
    });
  }
});