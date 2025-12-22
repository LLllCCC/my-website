// blog-data.js - 你的博客文章数据库

// 1. 文章数据列表 (以后写新文章，就在这里加一个 { ... })
const blogPosts = [
// 👇 新文章放在第一个 (自动成为最新文章)
    {
        title: "科普：云服务器到底是做什么的？",
        date: "2025-12-23",
        desc: "简单通俗地解释什么是云服务器 (VPS)，它能用来搭建博客、游戏服、私人云盘，以及它与家用电脑的区别。",
        link: "posts/post-2.html",  // 对应刚才创建的文件
        tags: ["科普", "服务器"],
        cover: "assets/project-2.jpg" // 封面图
    },
    {
        title: "如何用 HTML 和 CSS 打造 Apple 风格主页",
        date: "2025-12-21",
        desc: "记录了我从零开始搭建个人主页的过程，包括 Bento Grid 布局、深色模式适配以及那些有趣的 CSS 3D 翻转特效...",
        link: "posts/post-1.html", // 链接到具体的文章文件
        tags: ["Web 开发", "设计"],
        cover: "assets/project-1.jpg" // 👈 新增这一行：封面图路径
    },
    {
        title: "Docker 部署音乐服务器踩坑记",
        date: "2025-10-15",
        desc: "在部署 QQ 音乐 API 镜像时遇到的网络问题和端口映射问题，以及我是如何通过修改配置解决它们的。",
        link: "#", // 还没写文章文件，先用 # 占位
        tags: ["Docker", "运维"],
        cover: "assets/map.jpg" // 👈 新增这一行
    },
    {
        title: "Hello World",
        date: "2025-08-01",
        desc: "这是我的第一篇博客。网站正式上线了！",
        link: "#",
        tags: ["生活"],
        cover: "assets/my-avatar.jpg" // 👈 新增这一行
    }
];

// 2. 渲染函数：把数据变成 HTML 卡片
function renderBlogPosts() {
    const listContainer = document.querySelector('.article-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    blogPosts.forEach(post => {
        const tagsHtml = post.tags.map(tag => `<span class="tag-small">${tag}</span>`).join('');

        // 👇 核心修改在这里：
        // 1. 顶部插入了 <div class="article-cover">...</div>
        // 2. 文字内容被包在 <div class="article-body">...</div> 里
        const html = `
        <article class="card article-card fade-in">
            <div class="article-cover">
                <img src="${post.cover}" alt="${post.title}">
            </div>
            
            <div class="article-body">
                <div class="article-meta">
                    <div class="article-date">${post.date}</div>
                    ${tagsHtml}
                </div>
                <h2 class="article-title">${post.title}</h2>
                <p class="article-excerpt">${post.desc}</p>
                <a href="${post.link}" class="read-more">阅读全文 <i class="ri-arrow-right-line"></i></a>
            </div>
        </article>
        `;
        
        listContainer.innerHTML += html;
    });
}

// 3. 等待页面加载完毕后，自动运行
document.addEventListener("DOMContentLoaded", renderBlogPosts);