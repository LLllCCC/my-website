// 1. 定义音频
const clickSound = new Audio('https://yopo.edu.kg/assets/click.mp3');

// 2. 核心：增加一个“全局激活器”
// 只要用户点一下页面任何地方，我们就让音频“静音播放”一次，骗过浏览器
document.addEventListener('click', function() {
    clickSound.play().then(() => {
        clickSound.pause(); // 播放成功立刻暂停
        clickSound.currentTime = 0;
    }).catch(e => {}); 
}, { once: true }); // 只执行一次

// 3. Email 点击监控（保持不变）
document.querySelector('a[href^="mailto:"]').addEventListener('click', function(e) {
    clickSound.currentTime = 0;
    clickSound.play().catch(err => console.log("播放失败:", err));
    
    // ... 问候语逻辑保持不变 ...
    showToast(`${greeting} 正在为您唤起邮件客户端...`);
});