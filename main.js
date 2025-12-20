// 1. Email 点击监控与弹窗反馈
document.querySelector('a[href^="mailto:"]').addEventListener('click', function(e) {
    console.log("Email 按钮被点击了");
    showToast("正在为您唤起邮件客户端...");
});

// 2. 创建弹窗的函数
function showToast(message) {
    // 创建一个 div 元素
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;

    // 将它添加到页面中
    document.body.appendChild(toast);

    // 3秒后自动消失并移除
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// 3. 实时时间函数
function updateTime() {
    const timeElement = document.getElementById('local-time');
    // 添加一个安全检查，防止找不到元素时报错
    if (!timeElement) return; 

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    timeElement.textContent = `${hours}:${minutes}:${seconds}`;
}

// 4. 启动定时器
setInterval(updateTime, 1000);
updateTime();