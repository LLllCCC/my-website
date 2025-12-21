// 将主题初始化从 index.html 移到此文件，页面头部直接引用此脚本以避免主题闪烁
(function(){
    try{
        const t = localStorage.getItem('theme');
        if (t) document.documentElement.setAttribute('data-theme', t);
    }catch(e){ /* ignore */ }
})();
