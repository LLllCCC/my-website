// blog-data.js - 你的博客文章数据库

// 1. 文章数据列表 (以后写新文章，就在这里加一个 { ... })
const blogPosts = [
    {
        title: "如何用 HTML 和 CSS 打造 Apple 风格主页",
        date: "2025-12-21",
        desc: "记录了我从零开始搭建个人主页的过程，包括 Bento Grid 布局、深色模式适配以及那些有趣的 CSS 3D 翻转特效...",
        link: "posts/post-1.html", // 链接到具体的文章文件
        tags: ["Web 开发", "设计"]
    },
    {
        title: "Docker 部署音乐服务器踩坑记",
        date: "2025-10-15",
        desc: "在部署 QQ 音乐 API 镜像时遇到的网络问题和端口映射问题，以及我是如何通过修改配置解决它们的。",
        link: "#", // 还没写文章文件，先用 # 占位
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

// 2. 渲染函数：把数据变成 HTML 卡片
function renderBlogPosts() {
    // 找到 blog.html 里的容器
    const listContainer = document.querySelector('.article-list');
    
    // 如果找不到容器（比如当前在首页），就不运行，防止报错
    if (!listContainer) return;

    // 清空容器（防止重复渲染）
    listContainer.innerHTML = '';

    // 循环遍历每一篇文章数据
    blogPosts.forEach(post => {
        // 生成标签的 HTML
        const tagsHtml = post.tags.map(tag => `<span class="tag-small">${tag}</span>`).join('');

        // 生成卡片的 HTML
        const html = `
        <article class="card article-card fade-in">
            <div class="article-meta">
                <div class="article-date">${post.date}</div>
                ${tagsHtml}
            </div>
            <h2 class="article-title">${post.title}</h2>
            <p class="article-excerpt">${post.desc}</p>
            <a href="${post.link}" class="read-more">阅读全文 <i class="ri-arrow-right-line"></i></a>
        </article>
        `;
        
        // 把生成的 HTML 塞进容器里
        listContainer.innerHTML += html;
    });
}

// 3. 等待页面加载完毕后，自动运行
document.addEventListener("DOMContentLoaded", renderBlogPosts);