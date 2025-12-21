// nav.js - 全站统一且美颜的导航栏

function loadNavbar() {
    // 1. 获取当前路径，用于判断在哪个页面
    const path = window.location.pathname;
    const isBlogPage = path.includes("blog.html") || path.includes("posts/");

    // 2. 定义左上角的 Logo (全站统一长这样，带强制美颜样式)
    // 关键点：style="color: inherit; text-decoration: none;" 这一句治好了“蓝色链接病”
    const logoHtml = `
        <div class="logo">
            <a href="/index.html" style="text-decoration: none; color: inherit; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.6'" onmouseout="this.style.opacity='1'">YOPO</a>
            
            <span style="margin: 0 5px; opacity: 0.4;">/</span>
            
            <a href="/blog.html" style="text-decoration: none; color: inherit; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.6'" onmouseout="this.style.opacity='1'">BLOG</a>
        </div>
    `;

    // 3. 定义右上角的菜单 (根据页面自动变)
    let linksHtml = '';

    if (isBlogPage) {
        // [场景 A：博客里] -> 右边简洁点，只留回首页
        linksHtml = `
            <a href="/index.html">首页</a>
        `;
    } else {
        // [场景 B：主页里] -> 右边显示全套菜单
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