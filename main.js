// 1. 创建唯一的全局音频实例
const clickSound = new Audio('./assets/click.mp3');
clickSound.preload = 'auto'; // 强制浏览器预读文件

// 2. 核心：通过全局点击激活音频上下文（兼容 iOS/Safari/Chrome）
// 只要用户在页面任何地方点一下，音频就被“唤醒”了
document.addEventListener('click', function() {
    clickSound.play().then(() => {
        clickSound.pause(); 
        clickSound.currentTime = 0;
    }).catch(e => {}); 
}, { once: true });

// 3. Email 卡片点击监听
const mailtoLink = document.querySelector('a[href^="mailto:"]');
if (mailtoLink) {
    mailtoLink.addEventListener('click', function(e) {
    // 逻辑 A: 声音播放（不使用 load()，直接重置并播放）
    clickSound.currentTime = 0;
    const playPromise = clickSound.play();
    
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.log("播放被拦截，尝试手动触发");
        });
    }

    // 逻辑 B: 时间判断与问候
    const now = new Date();
    const hour = now.getHours();
    let greeting = "";

    if (hour >= 5 && hour < 11) greeting = "早上好！☀️";
    else if (hour >= 11 && hour < 13) greeting = "中午好！🍽️";
    else if (hour >= 13 && hour < 18) greeting = "下午好！☕";
    else if (hour >= 18 && hour < 22) greeting = "晚上好！🌙";
    else greeting = "夜深了，注意休息哦！🌃";

    showToast(`${greeting} 正在为您唤起邮件客户端...`);
    });
} else {
    console.warn('邮件链接元素未找到：a[href^="mailto:"] — 未绑定点击音效/问候逻辑。');
}

// 4. Toast 弹窗
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

// 5. 实时时间
function updateTime() {
    const timeElement = document.getElementById('local-time');
    if (!timeElement) return; 
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    timeElement.textContent = `${h}:${m}:${s}`;
}

setInterval(updateTime, 1000);
updateTime();

// --- 深色模式切换逻辑（保存到 localStorage，并在 html 元素上切换） ---
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const root = document.documentElement;
        const isLight = root.getAttribute('data-theme') === 'light';

        if (isLight) {
            root.removeAttribute('data-theme'); // 移除 light 回到默认 dark
            try { localStorage.removeItem('theme'); } catch(e) {}
            showToast("已开启深色模式 🌙");
        } else {
            root.setAttribute('data-theme', 'light'); // 开启清新蓝模式
            try { localStorage.setItem('theme', 'light'); } catch(e) {}
            showToast("已开启清新模式 ✨");
        }

        // 播放点击音效
        if (typeof clickSound !== 'undefined') {
            clickSound.currentTime = 0;
            clickSound.play().catch(e => {});
        }
    });
}

        // --- 鼠标停止检测：当鼠标在社交卡片上停住超过 600ms，添加 .stopped 类触发动画 ---
        (function(){
            const els = document.querySelectorAll('.card-social');
            els.forEach(el => {
                let timer = null;
                el.addEventListener('mousemove', () => {
                    if (timer) clearTimeout(timer);
                    if (el.classList.contains('stopped')) el.classList.remove('stopped');
                    timer = setTimeout(() => {
                        el.classList.add('stopped');
                    }, 600);
                });
                el.addEventListener('mouseleave', () => {
                    if (timer) { clearTimeout(timer); timer = null; }
                    el.classList.remove('stopped');
                });
                // 支持键盘焦点触发（可选）
                el.setAttribute('tabindex', '0');
                el.addEventListener('focus', () => {
                    if (timer) clearTimeout(timer);
                    timer = setTimeout(() => el.classList.add('stopped'), 600);
                });
                el.addEventListener('blur', () => { if (timer) { clearTimeout(timer); timer = null; } el.classList.remove('stopped'); });
            });
        })();

        // --- 🚀 首页博客卡片自动更新逻辑 ---
document.addEventListener("DOMContentLoaded", function() {
    // 1. 检查数据是否存在 (blogPosts 来自 blog-data.js)
    if (typeof blogPosts === 'undefined' || blogPosts.length === 0) return;

    // 2. 获取最新的一篇文章 (数组的第0个)
    const latestPost = blogPosts[0];

    // 3. 找到主页的卡片元素
    const card = document.getElementById('home-blog-card');
    const title = document.getElementById('home-blog-title');
    const desc = document.getElementById('home-blog-desc');

    // 4. 如果元素都存在，就更新它们
    if (card && title && desc) {
        // 更新背景图
        if (latestPost.cover) {
            card.style.backgroundImage = `url('${latestPost.cover}')`;
        }
        
        // 更新标题
        title.textContent = latestPost.title;

        // 更新简介 (如果没有简介，就显示默认文字)
        desc.textContent = latestPost.desc || "点击阅读最新文章";
        
        // 可选：让卡片直接跳转到最新文章，而不是博客列表
        // card.href = latestPost.link; 
    }
});


// --- 🚀 音乐搜索 API 联动逻辑 ---

// 1. 定义你的云端 API 地址
const myApiUrl = "https://yopolute-my-docker-test.hf.space/search?key="; 

// 2. 搜索函数
async function searchMusic() {
    const input = document.getElementById('music-input');
    const resultDiv = document.getElementById('search-results');
    const keyword = input.value.trim();

    if (!keyword) {
        showToast("请输入歌名内容哦！");
        return;
    }

    resultDiv.innerHTML = "🔍 正在从云端抓取数据...";

    try {
        // 使用 encodeURIComponent 确保中文歌名不会导致链接断裂
        const response = await fetch(myApiUrl + encodeURIComponent(keyword));
        
        if (!response.ok) throw new Error('网络响应异常');
        
        const data = await response.json();
        
        // 打印到控制台，如果还是搜不到，请按 F12 告诉我在 Console 里的内容
        console.log("收到原始数据:", data);

        // 更加严谨的层级检查
        if (data && data.result && data.result.songs && data.result.songs.length > 0) {
            const song = data.result.songs[0];
            resultDiv.innerHTML = `
                <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); text-align: left;">
                    <p style="margin: 0 0 5px 0;">✅ 找到歌曲：<strong>${song.name}</strong></p>
                    <p style="margin: 0 0 5px 0; font-size: 0.85em; opacity: 0.8;">🎤 歌手：${song.artists[0].name}</p>
                    <p style="margin: 0; font-size: 0.85em; opacity: 0.8;">💿 专辑：${song.album.name}</p>
                </div>
            `;
            showToast("搜索成功！✨");
        } else {
            // 如果 API 返回 code 200 但没有 result，可能是接口被临时封禁
            resultDiv.innerHTML = "❌ 服务器返回了空数据，请稍后再试或换个关键词。";
        }
    } catch (error) {
        console.error("搜索失败详情:", error);
        resultDiv.innerHTML = "🛑 API 连接失败。请确保 Hugging Face 为绿色 Running 状态。";
        showToast("连接 API 失败 😢");
    }
}

// 4. 绑定点击事件
const searchBtn = document.getElementById('search-btn');
if (searchBtn) {
    searchBtn.addEventListener('click', searchMusic);
    // 支持回车搜索
    document.getElementById('music-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchMusic();
    });
}