// 1. 在文件顶部预加载音效（使用绝对路径最稳妥）
const clickSound = new Audio('https://yopo.edu.kg/assets/click.mp3');

// 2. 核心：全局激活器（骗过浏览器的静音政策）
document.addEventListener('click', function() {
    clickSound.play().then(() => {
        clickSound.pause(); 
        clickSound.currentTime = 0;
    }).catch(e => {
        console.log("音频激活中...");
    }); 
}, { once: true });

// 3. Email 点击监控
document.querySelector('a[href^="mailto:"]').addEventListener('click', function(e) {
    // 唤醒音频引擎
    clickSound.load(); 
    
    // 延迟一点点播放，确保硬件准备好
    setTimeout(() => {
        clickSound.play().catch(err => {
            console.error("播放失败:", err);
        });
    }, 50);

    // 智能判断当前时间段
    const now = new Date();
    const hour = now.getHours();
    let greeting = "";

    if (hour >= 5 && hour < 11) {
        greeting = "早上好！☀️";
    } else if (hour >= 11 && hour < 13) {
        greeting = "中午好！🍽️";
    } else if (hour >= 13 && hour < 18) {
        greeting = "下午好！☕";
    } else if (hour >= 18 && hour < 22) {
        greeting = "晚上好！🌙";
    } else {
        greeting = "夜深了，注意休息哦！🌃";
    }

    console.log("Email 按钮被点击了");
    showToast(`${greeting} 正在为您唤起邮件客户端...`);
});

// 4. 创建弹窗的通用函数
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// 5. 实时时间函数
function updateTime() {
    const timeElement = document.getElementById('local-time');
    if (!timeElement) return; 
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    timeElement.textContent = `${hours}:${minutes}:${seconds}`;
}

// 6. 启动定时器
setInterval(updateTime, 1000);
updateTime();