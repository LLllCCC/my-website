// nav.js - 全站统一导航栏 (修复主页蓝色链接问题)

function loadNavbar() {
    // 1. 获取当前路径，判断在哪里
    const path = window.location.pathname;
    // 如果路径里有 blog.html 或者 posts/，就说明在博客区域
    const isBlogSection = path.includes("blog.html") || path.includes("posts/");

    // =========================================
    // 🔴 核心修复：全站统一的左上角 LOGO 代码
    // 这里给 <a> 标签加上了 style="color: inherit; text-decoration: none;"
    // 这就是解决主页蓝色链接的关键！无论在哪里，它都长这样。
    // =========================================
    const logoHtml = `
        <div class="logo">
            <a href="/index.html" style="text-decoration: none; color: inherit; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.6'" onmouseout="this.style.opacity='1'">YOPO</a>
            
            <span style="margin: 0 5px; opacity: 0.4;">/</span>
            
            <a href="/blog.html" style="text-decoration: none; color: inherit; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.6'" onmouseout="this.style.opacity='1'">BLOG</a>
        </div>
    `;

    // 3. 定义右上角的菜单 (根据页面自动变，但这不影响左边的样式)
    let linksHtml = '';

    if (isBlogSection) {
        // [场景 A：在博客区域] -> 右边显示回首页
        linksHtml = `
            <a href="/index.html">首页</a>
        `;
    } else {
        // [场景 B：在主页] -> 右边显示完整的锚点链接
        // 注意：这里的链接 CSS 已经在 style.css 里定义好了，所以不用加内联样式
        linksHtml = `
            <a href="/index.html">首页</a>
            <a href="#my-projects">项目</a>
            <a href="#skills">关于</a>
        `;
    }

    // 4. 组装最终 HTML
    const navHTML = `
    <nav>
        <div class="nav-container">
            ${logoHtml}

            <div class="nav-links">
                ${linksHtml}
                
                <a href="javascript:void(0);" id="theme-toggle" class="nav-theme-toggle">
                    <img src="/assets/sun.png" class="icon-sun theme-icon-img" alt="Light Mode">
                    <img src="/assets/moon.png" class="icon-moon theme-icon-img" alt="Dark Mode">
                </a>
            </div>
        </div>
    </nav>
    `;

    // 5. 插入页面
    const navPlaceholder = document.getElementById("global-nav");
    if (navPlaceholder) {
        navPlaceholder.innerHTML = navHTML;
    }

    // 6. 重新绑定点击事件
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }
}

document.addEventListener("DOMContentLoaded", loadNavbar);