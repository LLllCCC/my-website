// blog-data.js - 博客文章数据中心

// 1. 这里是你的“数据库”，以后写文章只需要在这里加一个 {}
const blogPosts = [
    {
        title: "如何用 HTML 和 CSS 打造 Apple 风格主页",
        date: "2025-12-21",
        desc: "记录了我从零开始搭建个人主页的过程，包括 Bento Grid 布局、深色模式适配以及那些有趣的 CSS 3D 翻转特效...",
        link: "posts/post-1.html",
        tags: ["Web 开发", "设计"]
    },
    {
        title: "Docker 部署音乐服务器踩坑记",
        date: "2025-10-15",
        desc: "在部署 QQ 音乐 API 镜像时遇到的网络问题和端口映射问题，以及我是如何通过修改配置解决它们的。",
        link: "#", // 还没写好可以先放 #
        tags: ["Docker", "运维"]
    },
    {
        title: "Hello World",
        date: "2025-08-01",
        desc: "这是我的第一篇博客。网站正式上线了！",
        link: "#",
        tags: ["生活"]
    }
];

// 2. 渲染函数：把数据变成 HTML
function renderBlogPosts() {
    const listContainer = document.querySelector('.article-list');
    
    // 如果当前页面找不到 .article-list (比如在首页)，就不运行，防止报错
    if (!listContainer) return;

    // 清空现有的内容（防止重复）
    listContainer.innerHTML = '';

    // 循环遍历数据
    blogPosts.forEach(post => {
        // 创建 HTML 字符串
        const html = `
        <article class="card article-card fade-in">
            <div class="article-meta">
                <div class="article-date">${post.date}</div>
                ${post.tags.map(tag => `<span class="tag-small">${tag}</span>`).join('')}
            </div>
            <h2 class="article-title">${post.title}</h2>
            <p class="article-excerpt">${post.desc}</p>
            <a href="${post.link}" class="read-more">阅读全文 <i class="ri-arrow-right-line"></i></a>
        </article>
        `;
        
        // 插入到列表里
        listContainer.innerHTML += html;
    });
}

// 页面加载完成后运行
document.addEventListener("DOMContentLoaded", renderBlogPosts);