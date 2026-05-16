// nav.js - 全站统一导航栏 (修复主页蓝色链接问题)

function loadNavbar() {
    // 1. 获取当前路径，判断在哪里
    const path = window.location.pathname;
    // 如果路径里有 blog.html、post.html 或者 posts/，就说明在博客区域
    const isBlogSection = path.includes("blog.html") || path.includes("post.html") || path.includes("posts/");

    // =========================================
    // 🔴 核心修复：全站统一的左上角 LOGO 代码
    // 这里给 <a> 标签加上了 style="color: inherit; text-decoration: none;"
    // 这就是解决主页蓝色链接的关键！无论在哪里，它都长这样。
    // =========================================
    let logoHtml = '';
    if (isBlogSection) {
        logoHtml = `
            <div class="logo">
                <a href="/index.html">YOPO</a>
                <span>/</span>
                <a href="/blog.html">BLOG</a>
            </div>
        `;
    } else {
        // 主页只显示站点名，避免显示博客专属面包屑
        logoHtml = `
            <div class="logo">
                <a href="/index.html">YOPO</a>
            </div>
        `;
    }

    // 3. 右上角菜单链接
    let linksHtml = '';

    // 4. 组装最终 HTML — 对博客页面使用更窄的容器以与文章宽度对齐
    const containerClass = isBlogSection ? 'nav-container narrow' : 'nav-container';
    const navHTML = `
    <nav>
        <div class="${containerClass}">
            ${logoHtml}

            <div class="nav-links">
                ${linksHtml}
                
                <button id="theme-toggle" class="nav-theme-toggle" type="button" aria-label="切换主题" aria-pressed="false">
                    <img src="/assets/sun.png" class="icon-sun theme-icon-img" alt="Light Mode">
                    <img src="/assets/moon.png" class="icon-moon theme-icon-img" alt="Dark Mode">
                </button>
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
        const updateToggleState = () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const isLight = currentTheme === 'light';
            toggleBtn.setAttribute('aria-pressed', isLight.toString());
        };

        updateToggleState();

        toggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateToggleState();
        });
    }
}

document.addEventListener("DOMContentLoaded", loadNavbar);