// blog-data.js - 动态版 (从数据库获取)

// 👇 指向你刚才搭建好的后端 API
const API_URL = "http://64.188.26.147:8080/api/posts";

async function renderBlogPosts() {
    const listContainer = document.querySelector('.article-list');
    if (!listContainer) return;

    // 1. 显示加载中提示
    listContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#888;">正在从数据库加载文章... 🚀</div>';

    try {
        // 2. 向你的后端发起请求
        const response = await fetch(API_URL);
        
        // 检查请求是否成功
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const blogPosts = await response.json();

        listContainer.innerHTML = ''; // 清空加载提示

        // 3. 渲染数据
        blogPosts.forEach(post => {
            // 处理标签样式
            const tagsHtml = post.tags.map(tag => `<span class="tag-small">${tag}</span>`).join('');

            // 如果数据库里没填封面图，就用默认图
            const coverImage = post.cover || 'assets/map.jpg';

            const html = `
            <article class="card article-card fade-in">
                <div class="article-cover">
                    <img src="${coverImage}" alt="${post.title}" onerror="this.src='assets/map.jpg'">
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
        console.error("获取文章失败:", error);
        listContainer.innerHTML = '<div style="text-align:center; padding:20px;">加载失败，请检查网络或后端服务 😵</div>';
    }
}

// 自动运行
document.addEventListener("DOMContentLoaded", renderBlogPosts);