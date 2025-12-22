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
        showToast("请输入歌名...");
        return;
    }

    // 显示加载状态
    resultDiv.innerHTML = `<div style="text-align:center; opacity:0.7; padding:20px;">🔍 正在搜索全网乐库...</div>`;

    try {
        const response = await fetch(myApiUrl + encodeURIComponent(keyword) + "&token=yopo666");
        const data = await response.json();
        
        // 判断数据是否有效
        if (data && data.result && data.result.songs && data.result.songs.length > 0) {
            const songs = data.result.songs;
            
            // 1. 先默认用第一首歌初始化播放器
            updatePlayer(songs[0]);


            // 2. 生成下方的“歌曲选择列表”
            let listHtml = '<div style="margin-top: 15px; display: flex; flex-direction: column; gap: 8px;">';
            
            songs.forEach((song, index) => {
                const safeSongName = song.name.replace(/'/g, "\\'"); 
                const safeArtist = song.artists[0].name.replace(/'/g, "\\'");
                
                // 生成网易云官网链接
                const linkUrl = `https://music.163.com/#/song?id=${song.id}`;

                listHtml += `
                    <div class="song-item fade-in" 
                         style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(255,255,255,0.1); transition: 0.2s;"
                         onmouseover="this.style.background='rgba(255,255,255,0.15)'" 
                         onmouseout="this.style.background='rgba(255,255,255,0.05)'">
                        
                        <div style="flex: 1; cursor: pointer;" onclick="playSong(${song.id}, '${safeSongName}', '${safeArtist}')">
                            <div style="font-size: 0.9rem; font-weight: bold;">${index + 1}. ${song.name}</div>
                            <div style="font-size: 0.75rem; opacity: 0.6;">${song.artists[0].name} - ${song.album.name}</div>
                        </div>

                        <div style="display: flex; gap: 10px; align-items: center;">
                            <a href="${linkUrl}" target="_blank" title="去网易云官网听" style="text-decoration: none; color: inherit; opacity: 0.5; transition: 0.3s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.5'">
                                <i class="ri-external-link-line" style="font-size: 1.2rem;"></i>
                            </a>
                            
                            <div onclick="playSong(${song.id}, '${safeSongName}', '${safeArtist}')" style="cursor: pointer; opacity: 0.8;">
                                <i class="ri-play-circle-line" style="font-size: 1.5rem;"></i>
                            </div>
                        </div>
                    </div>
                `;
            });
            listHtml += '</div>';
         

            // 把列表加到播放器下面
            const playerBox = document.getElementById('current-player-box');
            if(playerBox) {
                playerBox.insertAdjacentHTML('afterend', listHtml);
            }

        } else {
            resultDiv.innerHTML = "❌ 未找到相关歌曲。";
        }
    } catch (error) {
        console.error("Search Error:", error);
        resultDiv.innerHTML = "🛑 网络连接异常。";
    }
}

// --- 辅助函数：更新播放器 (放在 searchMusic 外面) ---
function updatePlayer(song) {
    const resultDiv = document.getElementById('search-results');
    
    // 网易云播放器代码
    const playerHtml = `
        <iframe 
            frameborder="no" border="0" marginwidth="0" marginheight="0" 
            width="100%" height="86" 
            src="//music.163.com/outchain/player?type=2&id=${song.id}&auto=1&height=66">
        </iframe>
    `;

    // 重新渲染上半部分
    resultDiv.innerHTML = `
        <div id="current-player-box" class="fade-in" style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.2); margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 0 5px;">
                <div style="font-size: 0.9rem; opacity: 0.9;">
                    <i class="ri-netease-cloud-music-fill" style="color: #E60026;"></i> 
                    正在播放: <strong>${song.name}</strong>
                </div>
                <div style="font-size: 0.8rem; opacity: 0.6;">${song.artists[0].name}</div>
            </div>
            <div style="overflow: hidden; border-radius: 8px;">${playerHtml}</div>
        </div>
    `;
}

// --- 辅助函数：列表点击事件 (放在 searchMusic 外面) ---
window.playSong = function(id, name, artist) {
    updatePlayer({
        id: id,
        name: name,
        artists: [{ name: artist }]
    });
    showToast(`🎵 切歌：${name}`);
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