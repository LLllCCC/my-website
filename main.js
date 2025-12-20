// 1. Email 点击监控
document.querySelector('a[href^="mailto:"]').addEventListener('click', function(e) {
    console.log("Email 按钮被点击了");
});

// 2. 实时时间函数
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

// 3. 启动定时器
setInterval(updateTime, 1000);
updateTime();