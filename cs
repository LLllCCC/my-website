// 1. 在 main.js 最顶部定义
const clickSound = new Audio('assets/click.mp3');

// 2. 修改 Email 点击监听部分
document.querySelector('a[href^="mailto:"]').addEventListener('click', function(e) {
    // 强制将进度归零（这样连续点击时，声音能立刻重头播放）
    clickSound.currentTime = 0;
    clickSound.play().catch(err => {
        console.log("浏览器拦截了自动播放，需要先与页面产生交互", err);
    });

    // --- 下面是你原有的时间问候逻辑 ---
    const now = new Date();
    // ... (保持不变)
    showToast(`${greeting} 正在为您唤起邮件客户端...`);
});