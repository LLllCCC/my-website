// blog-data.js - 数据库完美修复版

// 👇 这里填你的服务器 IP + 端口
const API_URL = "/api/posts";

async function renderBlogPosts() {
    const listContainer = document.querySelector('.article-list');
    if (!listContainer) return;

    // 显示加载动画
    listContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#888;">正在从数据库加载文章... 🚀</div>';

    try {
        const response = await fetch(API_URL);
        const blogPosts = await response.json();

        listContainer.innerHTML = ''; // 清空提示

        // 遍历数据并生成卡片
        blogPosts.forEach(post => {
            // 🔴 关键修复：数据库取回的是字符串 "Web,CSS"，需要先 split 转成数组
            // 如果 post.tags 是空的，就给一个空数组 [] 防止报错
            const tagsArray = post.tags ? post.tags.split(',') : [];
            
            // 现在 tagsArray 肯定是数组了，可以安全地用 map 了
            const tagsHtml = tagsArray.map(tag => `<span class="tag-small">${tag}</span>`).join('');
            
            const html = `
            <article class="card article-card fade-in">
                <div class="article-cover">
                    <img src="${post.cover}" alt="${post.title}" onerror="this.src='assets/map.jpg'">
                </div>
                <div class="article-body">
                    <div class="article-meta">
                        <div class="article-date">${post.date}</div>
                        ${tagsHtml}
                    </div>
                    <h2 class="article-title">${post.title}</h2>
                    <p class="article-excerpt">${post.description}</p>
                    <a href="${post.link}" class="read-more">阅读全文 <i class="ri-arrow-right-line"></i></a>
                </div>
            </article>
            `;
            listContainer.innerHTML += html;
        });

    } catch (error) {
        console.error("加载失败:", error);
        // 如果出错，会在页面上显示
        listContainer.innerHTML = '<div style="text-align:center; padding:20px;">加载失败 😢 请按 F12 查看控制台报错</div>';
    }
}

document.addEventListener("DOMContentLoaded", renderBlogPosts);