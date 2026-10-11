// 壁纸页：缩略图网格 + 点开看原图的灯箱。
//
// 两条硬约束决定了这里的做法：
//   1. 原图很大（30 张共 75 MB，单张最大 18 MB），所以**列表里只放缩略图**
//      （img/wallpaper/ 下 480px 宽的小图，一页总共 1 MB 出头）。原图只在点开时加载。
//   2. 站点不直连 GitHub API（跨境慢，且未鉴权限流 60 次/小时），
//      所以清单是构建时生成好的 gallery.data.js，页面只读它。
//      新增壁纸要跑 scripts/build-gallery.py（见 AGENTS.md）。
import { GALLERY, GALLERY_CDN } from "./gallery.data.js?v=47";

document.addEventListener("DOMContentLoaded", function () {
  const grid = document.getElementById("gallery-grid");
  const status = document.getElementById("gallery-status");
  const countLabel = document.getElementById("gallery-count");
  if (!grid) return;

  const items = Array.isArray(GALLERY)
    ? GALLERY.filter(function (x) {
        return x && x.thumb && x.file;
      })
    : [];

  if (countLabel) countLabel.textContent = String(items.length).padStart(2, "0");

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "blog-empty-state";
    empty.setAttribute("role", "status");
    empty.textContent = "还没有壁纸。往图床的 Wallpaper/ 目录放几张，再跑一次构建脚本就有了。";
    grid.replaceChildren(empty);
    if (status) status.textContent = "暂无壁纸";
    return;
  }

  if (status) {
    status.textContent = "共 " + items.length + " 张 · 点开看大图";
  }

  // ---- 网格 ----
  const fragment = document.createDocumentFragment();
  items.forEach(function (item, index) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "gallery-item";
    button.dataset.index = String(index);
    button.setAttribute("aria-label", "查看第 " + (index + 1) + " 张壁纸的大图");

    const img = document.createElement("img");
    img.className = "gallery-thumb";
    img.src = item.thumb;
    img.alt = "壁纸 " + (index + 1);
    img.loading = "lazy"; // 关键：不这样首屏就会把一页缩略图全拉下来
    img.decoding = "async";
    // 带上宽高（缩略图的），浏览器据此预留位置，图片到达时不会把页面顶开
    if (item.w && item.h) {
      img.width = item.w;
      img.height = item.h;
    }

    button.appendChild(img);
    fragment.appendChild(button);
  });
  grid.replaceChildren(fragment);

  // ---- 灯箱 ----
  // 不用缩略图凑合：点开就是要看原图，所以这里直接请求 CDN 上的原图，
  // 加载期间给出提示（单张最大 18 MB，跨境线路上要等一下）。
  let current = -1;
  let overlay = null;

  function fullUrl(item) {
    return GALLERY_CDN + encodeURIComponent(item.file);
  }

  function close() {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    current = -1;
    document.documentElement.classList.remove("lightbox-open");
    document.removeEventListener("keydown", onKeydown);
    const opener = grid.querySelector(".gallery-item.is-open");
    if (opener) {
      opener.classList.remove("is-open");
      opener.focus();
    }
  }

  function show(index) {
    if (index < 0 || index >= items.length) return;
    if (overlay) close();

    const item = items[index];
    current = index;

    overlay = document.createElement("div");
    overlay.className = "lightbox-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "壁纸大图");

    const figure = document.createElement("figure");
    figure.className = "lightbox-figure";

    const hint = document.createElement("p");
    hint.className = "lightbox-hint";
    hint.textContent = "正在加载原图…";

    const img = document.createElement("img");
    img.className = "lightbox-image";
    img.alt = "壁纸 " + (index + 1);
    img.decoding = "async";
    if (item.w && item.h) {
      img.width = item.w;
      img.height = item.h;
    }
    img.addEventListener("load", function () {
      hint.remove();
    });
    img.addEventListener("error", function () {
      hint.textContent = "原图没加载出来，点下面的「查看原图」再试一次。";
    });
    img.src = fullUrl(item);

    const caption = document.createElement("figcaption");
    caption.className = "lightbox-caption";
    caption.textContent = index + 1 + " / " + items.length;

    // 下载/查看原图必须是普通链接：手机上下载大图最省事的办法就是长按/在新标签打开
    const openLink = document.createElement("a");
    openLink.className = "lightbox-link";
    openLink.href = fullUrl(item);
    openLink.target = "_blank";
    openLink.rel = "noopener noreferrer";
    openLink.textContent = "查看 / 下载原图";
    caption.appendChild(openLink);

    figure.append(hint, img, caption);
    overlay.appendChild(figure);

    overlay.addEventListener("click", function (event) {
      // 点图片本身不关（手指在图上滑动时容易误触），点空白或下面这条才关
      if (event.target === overlay) close();
    });

    document.documentElement.classList.add("lightbox-open");
    document.body.appendChild(overlay);

    const opener = grid.querySelector('.gallery-item[data-index="' + index + '"]');
    if (opener) opener.classList.add("is-open");

    document.addEventListener("keydown", onKeydown);
  }

  function step(delta) {
    if (current < 0) return;
    const next = current + delta;
    if (next < 0 || next >= items.length) return;
    show(next);
  }

  function onKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      step(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
    }
  }

  grid.addEventListener("click", function (event) {
    const button = event.target.closest ? event.target.closest(".gallery-item") : null;
    if (!button) return;
    show(Number(button.dataset.index));
  });
});
