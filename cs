/* --- 🚀 让卡片浮起更慢、更丝滑 --- */
.card {
    /* 把原来的 0.3s 改成 0.6s 或 0.8s */
    transition: all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) !important;
}

/* 如果觉得 3D 翻转也太快，可以把翻转速度也同步变慢 */
.card-social-flip {
    transition: transform 0.8s cubic-bezier(0.4, 0.2, 0.2, 1) !important;
}