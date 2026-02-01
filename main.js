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
const myApiUrl = "https://music-api.888431.xyz/search?keywords=";
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
        // 删掉了后面的 + "&token=..."
        const response = await fetch(myApiUrl + encodeURIComponent(keyword));
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

// --- 核心播放逻辑：从你自己的 API 获取 MP3 地址 ---
async function updatePlayer(song) {
    const resultDiv = document.getElementById('search-results');
    const playerBoxId = 'current-player-box';
    
    // 1. 查找是否已经有播放器盒子，如果没有就创建一个占位
    let playerBox = document.getElementById(playerBoxId);
    if (!playerBox) {
        // 如果是第一次播放，创建一个新的盒子插在列表最前面
        const newBox = document.createElement('div');
        newBox.id = playerBoxId;
        newBox.className = 'fade-in';
        newBox.style.marginBottom = '15px';
        resultDiv.insertBefore(newBox, resultDiv.firstChild);
        playerBox = newBox;
    }

    // 2. 显示“加载中...”状态
    playerBox.innerHTML = `
        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.2);">
            <div style="margin-bottom: 8px;">⏳ 正在解析音乐地址...</div>
            <div style="font-size: 0.8rem; opacity: 0.7;">${song.name} - ${song.artists[0].name}</div>
        </div>
    `;

    try {
        // 3. 关键一步：向你的 API 请求真实的 MP3 链接
        // ⚠️ 注意：这里用了你的新域名
        const res = await fetch(`https://music-api.888431.xyz/song/url?id=${song.id}`);
        const data = await res.json();
        
        if (!data.data || !data.data[0].url) {
            playerBox.innerHTML = `<div style="padding:15px; text-align:center; color:#ff4d4d; background: rgba(255,255,255,0.1); border-radius:12px;">🚫 抱歉，这首歌有版权限制，无法播放。</div>`;
            return;
        }

        const mp3Url = data.data[0].url;

        // 4. 渲染原生 <audio> 播放器 (100% 可用)
        playerBox.innerHTML = `
            <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(10px);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 5px;">
                    <div style="font-size: 0.95rem; font-weight: 600;">
                        <i class="ri-music-2-fill" style="color: #2ecc71; margin-right: 5px;"></i> 
                        ${song.name}
                    </div>
                    <div style="font-size: 0.8rem; opacity: 0.6;">${song.artists[0].name}</div>
                </div>
                
                <audio controls autoplay style="width: 100%; height: 32px; outline: none;">
                    <source src="${mp3Url}" type="audio/mpeg">
                    您的浏览器不支持音频播放。
                </audio>
            </div>
        `;

    } catch (error) {
        console.error("播放失败:", error);
        playerBox.innerHTML = `<div style="padding:15px; text-align:center;">⚠️ 播放出错，请重试</div>`;
    }
}

// --- 辅助函数：列表点击事件 ---
// 这里加了 async，因为 updatePlayer 现在是异步的了
window.playSong = async function(id, name, artist) {
    // 简单的防抖：如果名字里有单引号，处理一下防止报错
    const safeName = String(name).replace(/'/g, "");
    const safeArtist = String(artist).replace(/'/g, "");

    await updatePlayer({
        id: id,
        name: safeName,
        artists: [{ name: safeArtist }]
    });
    
    showToast(`🎵 正在切歌：${safeName}`);
}

// 4. 绑定点击事件 (保持不变)
const searchBtn = document.getElementById('search-btn');
if (searchBtn) {
    searchBtn.addEventListener('click', searchMusic);
    document.getElementById('music-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchMusic();
    });
}

// --- 🤖 AI 聊天功能逻辑 ---
document.addEventListener('DOMContentLoaded', () => {
    const chatCircle = document.getElementById('chat-circle');
    const chatBox = document.getElementById('chat-box');
    const chatClose = document.getElementById('chat-close');
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');
    const messagesDiv = document.getElementById('chat-messages');

    // 你的后端地址 (请确认这个地址是对的)
    const AI_API_URL = "https://yopolute-my-docker-test.hf.space/chat?token=yopo666";

    if (chatCircle) {
        // 1. 打开/关闭聊天窗
        chatCircle.addEventListener('click', () => {
            chatCircle.style.display = 'none';
            chatBox.style.display = 'flex';
            // 自动聚焦输入框
            setTimeout(() => chatInput.focus(), 100);
        });

        chatClose.addEventListener('click', () => {
            chatBox.style.display = 'none';
            chatCircle.style.display = 'flex';
        });

        // 2. 发送消息核心逻辑
        async function sendMessage() {
            const text = chatInput.value.trim();
            if (!text) return;

            // 显示用户消息
            addMessage(text, 'user-message');
            chatInput.value = '';
            chatInput.focus();

            // 显示“思考中”状态
            const loadingId = addMessage("Thinking... 🤔", 'ai-message');

            try {
                const response = await fetch(AI_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: text })
                });
                
                const data = await response.json();
                
                // 移除“思考中”，显示真实回复
                const loadingMsg = document.getElementById(loadingId);
                if (loadingMsg) loadingMsg.remove();

                if (data.reply) {
                    addMessage(data.reply, 'ai-message');
                } else {
                    addMessage("大脑短路了，请重试 😵", 'ai-message');
                }

            } catch (error) {
                console.error(error);
                const loadingMsg = document.getElementById(loadingId);
                if (loadingMsg) loadingMsg.remove();
                addMessage("网络连接失败 🛑", 'ai-message');
            }
        }

        // 3. 辅助函数：添加消息气泡
        function addMessage(text, className) {
            const div = document.createElement('div');
            const id = 'msg-' + Date.now();
            div.id = id;
            div.className = `message ${className}`;
            div.innerText = text; // 使用 innerText 防止 XSS
            messagesDiv.appendChild(div);
            // 自动滚动到底部
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            return id;
        }

        // 4. 绑定发送事件
        chatSend.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
});

// --- 🚀 选项 2：高级 3D 视差悬停特效 (Apple TV 风格) ---
document.addEventListener("DOMContentLoaded", function() {
    // 1. 选择所有需要特效的卡片
    // 注意：我们排除了 .card-social-container，因为它们已经有翻转特效了，避免冲突
    const cards = document.querySelectorAll('.card:not(.card-social-container)');

    cards.forEach(card => {
        // 2. 鼠标移动时：计算角度并跟随
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left; // 鼠标在卡片内的 X 坐标
            const y = e.clientY - rect.top;  // 鼠标在卡片内的 Y 坐标
            
            // 计算中心点
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            // 核心算法：鼠标越靠边，旋转角度越大
            // limit 是最大旋转角度，设为 8~10 度比较优雅
            const limit = 8; 
            const rotateX = -((y - centerY) / centerY) * limit; // 上下翻转 (注意负号，让鼠标在上面时卡片往上翘)
            const rotateY = ((x - centerX) / centerX) * limit;  // 左右翻转

            // 应用 3D 变换
            // perspective(1000px) 是视距，越小透视感越强
            // scale3d(1.02...) 是为了稍微浮起一点，更有质感
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        });

        // 3. 鼠标进入时：为了丝滑跟手，必须暂时关掉 CSS 的 transition
        card.addEventListener('mouseenter', () => {
            card.style.transition = 'none'; // 🔴 关键：移除延迟，让卡片瞬间响应鼠标
        });

        // 4. 鼠标离开时：平滑复位
        card.addEventListener('mouseleave', () => {
            // 加回 transition，让复位动作有缓冲动画
            card.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        });
    });
});