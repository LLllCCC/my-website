const themeToggle = document.getElementById('theme-toggle');

themeToggle.addEventListener('click', () => {
    // 切换 body 的 data-theme 属性
    const isLight = document.body.getAttribute('data-theme') === 'light';
    
    if (isLight) {
        document.body.removeAttribute('data-theme'); // 回到深色模式
        showToast("已开启深色模式 🌙");
    } else {
        document.body.setAttribute('data-theme', 'light'); // 开启清新蓝模式
        showToast("已开启清新模式 ✨");
    }
    
    // 播放点击音效
    clickSound.currentTime = 0;
    clickSound.play().catch(e => {});
});