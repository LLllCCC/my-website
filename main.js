// 1. 在文件顶部预加载音效
const clickSound = new Audio('/assets/click.mp3');

// 1. Email 点击监控（升级版：加入智能问候语）
document.querySelector('a[href^="mailto:"]').addEventListener('click', function(e) {
// 强制将进度归零（这样连续点击时，声音能立刻重头播放）
    clickSound.currentTime = 0;
    clickSound.play().catch(err => {
        console.log("浏览器拦截了自动播放，需要先与页面产生交互", err);
    });

    const now = new Date();
    const hour = now.getHours();
    let greeting = "";

    // 智能判断当前时间段
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

// 2. 创建弹窗的通用函数（保留并优化）
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;

    document.body.appendChild(toast);

    // 3秒后自动淡出并移除
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// 3. 实时时间函数（保留：你的网页心脏）
function updateTime() {
    const timeElement = document.getElementById('local-time');
    if (!timeElement) return; 

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    timeElement.textContent = `${hours}:${minutes}:${seconds}`;
}

// 4. 启动定时器（保留：确保秒表每秒跳动）
setInterval(updateTime, 1000);
updateTime();