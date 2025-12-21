// footer.js - 全站通用页脚
document.addEventListener("DOMContentLoaded", function() {
    const footerHTML = `
    <footer class="site-footer">
        <p>© 2025 Yopo. Designed with Apple Style.</p>
        <p style="font-size: 0.8rem; margin-top: 5px; opacity: 0.6;">
            <a href="/index.html" style="color: inherit; text-decoration: none;">首页</a> | 
            <a href="/blog.html" style="color: inherit; text-decoration: none;">博客</a>
        </p>
    </footer>
    `;

    // 找到占位符并插入
    const footerPlaceholder = document.getElementById("global-footer");
    if (footerPlaceholder) {
        footerPlaceholder.innerHTML = footerHTML;
    }
});