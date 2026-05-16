document.addEventListener("DOMContentLoaded", async function() {
  const listContainer = document.getElementById("dynamic-article-list");
  const searchInput = document.getElementById("blog-search");
  if (!listContainer) return;

  let allPosts = []; // 用来存放原始数据

  function getPostLink(post) {
    return post.url ? post.url : `post.html?id=${post.id}`;
  }

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
                  <span class="post-date">${escapeHtml(post.date)}</span>
                  <span class="post-tag">${escapeHtml(post.tags || '生活')}</span>
              </div>
              <h2 class="post-title">${escapeHtml(post.title)}</h2>
              <a href="${escapeHtml(getPostLink(post))}" class="read-more">阅读全文 <i class="ri-arrow-right-line"></i></a>
          </div>
      `;
      listContainer.appendChild(card);
    });
  }

  function normalizePost(post) {
    return {
      ...post,
      tags: Array.isArray(post.tags) ? post.tags.join(', ') : post.tags || '生活',
      description: post.description || '',
      cover: normalizeCoverPath(post.cover),
    };
  }

  function normalizeCoverPath(cover) {
    if (!cover) return '';
    // keep absolute or protocol-relative URLs
    if (/^(https?:)?\/\//i.test(cover) || cover.startsWith('/')) return cover;
    // remove leading ../ segments so paths like "../assets/x.jpg" become "assets/x.jpg"
    return cover.replace(/^(?:\.\.\/)+/, '');
  }

  function mergePosts(remotePosts, localPosts) {
    const merged = [];
    const seen = new Set();
    remotePosts.forEach((post) => {
      const key = post.url || post.id;
      seen.add(key);
      merged.push(normalizePost(post));
    });
    localPosts.forEach((post) => {
      const key = post.url || post.id;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(normalizePost(post));
      }
    });
    return merged;
  }

  async function loadLocalPosts() {
    try {
      const response = await fetch(CONFIG.LOCAL_POSTS_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.warn('本地文章清单加载失败:', error);
      return [];
    }
  }

  async function loadPosts() {
    const localPosts = await loadLocalPosts();
    try {
      const response = await fetch(CONFIG.POSTS_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const remotePosts = await response.json();
      const merged = mergePosts(remotePosts, localPosts);
      merged.sort((a, b) => new Date(b.date) - new Date(a.date));
      return merged;
    } catch (error) {
      console.warn('远程文章加载失败，已回退到本地文章。', error);
      localPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
      return localPosts.map(normalizePost);
    }
  }

  // 2. 初始化加载
  allPosts = await loadPosts();
  if (allPosts.length === 0) {
    listContainer.innerHTML = `<p class="blog-empty-state blog-empty-state--error" role="status" aria-live="polite">当前没有可用文章，请稍后再试。</p>`;
  } else {
    renderPosts(allPosts);
  }

  // 3. 搜索监听（300ms 防抖）
  if (searchInput) {
    searchInput.addEventListener("input", debounce(function (e) {
      const keyword = e.target.value.toLowerCase();
      const filtered = allPosts.filter(
        function (post) {
          return (
            post.title.toLowerCase().includes(keyword) ||
            (post.description && post.description.toLowerCase().includes(keyword))
          );
        },
      );
      renderPosts(filtered);
    }, 300));
  }
});