// nav.js - 你的全站导航栏管家

function loadNavbar() {
    // 1. 定义导航栏的 HTML 代码
    // 注意：所有路径 href 和 src 都以 "/" 开头，代表从网站根目录开始找
    const navHTML = `
    <nav>
        <div class="nav-container">
            <div class="logo">
                <a href="/index.html" style="text-decoration: none; color: inherit; transition: opacity 0.2s;">YOPO</a>
                <span style="margin: 0 5px; opacity: 0.4;">/</span>
                <a href="/blog.html" style="text-decoration: none; color: inherit; transition: opacity 0.2s;">BLOG</a>
            </div>

            <div class="nav-links">
                <a href="/index.html">首页</a>
                
                <a href="javascript:void(0);" id="theme-toggle" class="nav-theme-toggle">
                    <img src="/assets/sun.png" class="icon-sun theme-icon-img" alt="Light Mode">
                    <img src="/assets/moon.png" class="icon-moon theme-icon-img" alt="Dark Mode">
                </a>
            </div>
        </div>
    </nav>
    `;

    // 2. 把这段 HTML 插入到页面里 ID 为 "global-nav" 的地方
    const navPlaceholder = document.getElementById("global-nav");
    if (navPlaceholder) {
        navPlaceholder.innerHTML = navHTML;
    }

    // 3. 重新激活“点击切换主题”的功能
    // 因为导航栏是刚生成的，必须在这里重新绑定点击事件
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

// 4. 等待页面加载完毕后，立即运行上面的函数
document.addEventListener("DOMContentLoaded", loadNavbar);