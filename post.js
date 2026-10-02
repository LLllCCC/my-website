document.addEventListener("DOMContentLoaded", async function () {
  var postId = new URLSearchParams(window.location.search).get("id");
  var articleTitle = document.getElementById("article-title");
  var articleBody = document.getElementById("article-body");

  function showMessage(message) {
    if (articleBody) articleBody.textContent = message;
  }

  if (!postId || !/^\d+$/.test(postId)) {
    showMessage("文章链接无效或缺少文章编号。");
    return;
  }

  try {
    var res = await fetch(CONFIG.API_BASE + "/posts/" + postId, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    var post = await res.json();

    document.title = (post.title || "博客文章") + " - Yopo";
    if (articleTitle) articleTitle.textContent = post.title || "未命名文章";
    var dateValue = typeof post.date === "string" ? post.date.substring(0, 10) : "";
    var date = document.getElementById("article-date");
    if (date) {
      date.textContent = dateValue.replace(/-/g, " / ");
      if (dateValue) date.dateTime = dateValue;
    }
    var tags = document.getElementById("article-tags");
    if (tags) {
      var tagValues = Array.isArray(post.tags) ? post.tags : String(post.tags || "").split(",");
      tagValues.map(function (tag) { return String(tag).trim(); }).filter(Boolean).forEach(function (tag) {
        var chip = document.createElement("span");
        chip.className = "article-tag";
        chip.textContent = tag;
        tags.appendChild(chip);
      });
    }

    var markdownRaw = post.content || "这篇文章还没有正文内容哦。";
    markdownRaw = joinWrappedImageUrls(markdownRaw);
    var coverFromBody = findFirstMarkdownImage(markdownRaw);
    var coverUrl = safeImageUrl(post.cover) || (coverFromBody && safeImageUrl(coverFromBody.url));
    var cover = document.getElementById("article-cover");
    var coverImage = document.getElementById("article-cover-image");
    if (cover && coverUrl) {
      coverImage.alt = (post.title || "文章") + " 封面";
      coverImage.addEventListener("load", function () {
        cover.querySelector(".article-hero-cover-backdrop").style.backgroundImage = "url(" + JSON.stringify(coverUrl) + ")";
        cover.hidden = false;
        enableCoverReposition(cover, coverImage, postId);
      }, { once: true });
      coverImage.addEventListener("error", function () { cover.hidden = true; }, { once: true });
      coverImage.src = coverUrl;
    }
    markdownRaw = convertBareImageLinks(markdownRaw);
    var count = (markdownRaw.match(/[\u3400-\u9fff]/g) || []).length +
      (markdownRaw.match(/[A-Za-z0-9]+/g) || []).length;
    var minutes = Math.max(1, Math.ceil(count / 450));
    var readTime = document.getElementById("article-read-time");
    if (readTime) readTime.textContent = "约 " + minutes + " 分钟阅读";

    if (articleBody && window.marked && window.DOMPurify) {
      articleBody.innerHTML = DOMPurify.sanitize(marked.parse(markdownRaw));
      replaceImageLinks(articleBody);
      buildTOC(articleBody);
      initReadingProgress();
    } else {
      showMessage("文章格式组件暂时不可用，请刷新页面重试。");
    }
  } catch (err) {
    console.error(err);
    showMessage("文章加载失败，请稍后重试；如果问题持续，请检查博客服务是否运行。");
  }
});

function safeImageUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    var url = new URL(value.trim(), window.location.href);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch (_) {
    return "";
  }
}

function isImageUrl(value) {
  try {
    var pathname = new URL(value, window.location.href).pathname;
    return /\.(?:avif|gif|jpe?g|png|svg|webp|bmp)$/i.test(pathname);
  } catch (_) {
    return false;
  }
}

function joinWrappedImageUrls(markdown) {
  var lines = markdown.split(/\r?\n/);
  var output = [];
  for (var i = 0; i < lines.length; i++) {
    var current = lines[i].trim();
    if (!/^https?:\/\/\S+$/i.test(current) || isImageUrl(current)) {
      output.push(lines[i]);
      continue;
    }
    var combined = current;
    var joined = false;
    for (var next = i + 1; next < lines.length && next <= i + 4; next++) {
      var continuation = lines[next].trim();
      if (!continuation || /^https?:\/\//i.test(continuation)) break;
      combined += continuation;
      if (isImageUrl(combined)) {
        output.push(combined);
        i = next;
        joined = true;
        break;
      }
    }
    if (!joined) output.push(lines[i]);
  }
  return output.join("\n");
}

function findFirstMarkdownImage(markdown) {
  var lines = markdown.split(/\r?\n/);
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    var markdownMatch = line.match(/^!\[[^\]]*\]\(<?(https?:\/\/[^\s)>]+)>?(?:\s+[^)]*)?\)$/i);
    if (markdownMatch) return { url: markdownMatch[1], line: lines[i], standalone: true };
    var bareMatch = line.match(/^(https?:\/\/\S+)$/i);
    if (bareMatch && isImageUrl(bareMatch[1])) return { url: bareMatch[1], line: lines[i], standalone: true };
  }
  var inline = markdown.match(/!\[[^\]]*\]\(<?(https?:\/\/[^\s)>]+)>?(?:\s+[^)]*)?\)/i);
  if (inline) return { url: inline[1], line: "", standalone: false };
  var urls = markdown.match(/https?:\/\/[^\s<>]+/gi) || [];
  var imageUrl = urls.map(function (url) { return url.replace(/[.,;!?]+$/, ""); }).find(isImageUrl);
  return imageUrl ? { url: imageUrl, line: "", standalone: false } : null;
}

function convertBareImageLinks(markdown) {
  return markdown.split(/\r?\n/).map(function (line) {
    var trimmed = line.trim();
    var match = trimmed.match(/^(https?:\/\/\S+)$/i);
    if (!match || !isImageUrl(match[1])) return line;
    return "![](" + match[1] + ")";
  }).join("\n");
}

function replaceImageLinks(articleBody) {
  articleBody.querySelectorAll("a[href]").forEach(function (link) {
    var imageUrl = safeImageUrl(link.href);
    if (!imageUrl || !isImageUrl(imageUrl)) return;
    var label = link.textContent.trim();
    var labelIsUrl = /^https?:\/\//i.test(label);
    var image = document.createElement("img");
    image.src = imageUrl;
    image.alt = labelIsUrl ? "文章图片" : label || "文章图片";
    image.loading = "lazy";
    image.decoding = "async";
    link.replaceWith(image);
  });

  var walker = document.createTreeWalker(articleBody, NodeFilter.SHOW_TEXT, {
    acceptNode: function (node) {
      return node.parentElement && !node.parentElement.closest("a, code, pre, script, style") &&
        /https?:\/\/\S+/i.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  var textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach(function (node) {
    var value = node.nodeValue;
    var pattern = /https?:\/\/[^\s<>"']+/gi;
    var match;
    var lastIndex = 0;
    var fragment = document.createDocumentFragment();
    var replaced = false;
    while ((match = pattern.exec(value))) {
      var candidate = match[0].replace(/[.,;!?]+$/, "");
      var imageUrl = safeImageUrl(candidate);
      if (!imageUrl || !isImageUrl(imageUrl)) continue;
      if (match.index > lastIndex) fragment.appendChild(document.createTextNode(value.slice(lastIndex, match.index)));
      var image = document.createElement("img");
      image.src = imageUrl;
      image.alt = "文章图片";
      image.loading = "lazy";
      image.decoding = "async";
      fragment.appendChild(image);
      lastIndex = match.index + candidate.length;
      replaced = true;
    }
    if (replaced) {
      if (lastIndex < value.length) fragment.appendChild(document.createTextNode(value.slice(lastIndex)));
      node.replaceWith(fragment);
    }
  });
}

function enableCoverReposition(frame, image, postId) {
  var storageKey = "yopo-cover-position-" + postId;
  var position = { x: 50, y: 50 };
  try {
    var saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) position = saved;
  } catch (_) {}

  function renderPosition() {
    image.style.objectPosition = position.x + "% " + position.y + "%";
  }
  function savePosition() {
    try { localStorage.setItem(storageKey, JSON.stringify(position)); } catch (_) {}
  }
  function clamp(value) { return Math.max(0, Math.min(100, value)); }
  function drag(event) {
    if (event.button !== 0) return;
    event.preventDefault();
    frame.setPointerCapture(event.pointerId);
    frame.classList.add("is-dragging-cover");
    var startX = event.clientX;
    var startY = event.clientY;
    var startPosition = { x: position.x, y: position.y };
    var rect = frame.getBoundingClientRect();
    var scale = Math.max(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
    var overflowX = Math.max(0, image.naturalWidth * scale - rect.width);
    var overflowY = Math.max(0, image.naturalHeight * scale - rect.height);

    function move(moveEvent) {
      position.x = overflowX ? clamp(startPosition.x - (moveEvent.clientX - startX) / overflowX * 100) : 50;
      position.y = overflowY ? clamp(startPosition.y - (moveEvent.clientY - startY) / overflowY * 100) : 50;
      renderPosition();
    }
    function finish() {
      frame.classList.remove("is-dragging-cover");
      frame.removeEventListener("pointermove", move);
      frame.removeEventListener("pointerup", finish);
      frame.removeEventListener("pointercancel", finish);
      savePosition();
    }
    frame.addEventListener("pointermove", move);
    frame.addEventListener("pointerup", finish, { once: true });
    frame.addEventListener("pointercancel", finish, { once: true });
  }

  frame.addEventListener("pointerdown", drag);
  frame.addEventListener("keydown", function (event) {
    var step = event.shiftKey ? 10 : 3;
    if (event.key === "ArrowLeft") position.x = clamp(position.x - step);
    else if (event.key === "ArrowRight") position.x = clamp(position.x + step);
    else if (event.key === "ArrowUp") position.y = clamp(position.y - step);
    else if (event.key === "ArrowDown") position.y = clamp(position.y + step);
    else return;
    event.preventDefault();
    renderPosition();
    savePosition();
  });
  renderPosition();
}

function buildTOC(articleBody) {
  var tocContainer = document.getElementById("article-toc");
  if (!tocContainer) return;
  var headings = articleBody.querySelectorAll("h2, h3");
  if (headings.length < 2) {
    tocContainer.hidden = true;
    return;
  }
  headings.forEach(function (heading, index) {
    if (!heading.id) heading.id = "heading-" + index;
  });
  var title = document.createElement("div");
  title.className = "article-toc-title";
  title.textContent = "本文目录";
  tocContainer.appendChild(title);
  var list = document.createElement("ul");
  list.className = "article-toc-list";
  headings.forEach(function (heading) {
    var item = document.createElement("li");
    item.className = "article-toc-item" + (heading.tagName === "H3" ? " article-toc-item--sub" : "");
    var link = document.createElement("a");
    link.href = "#" + heading.id;
    link.textContent = heading.textContent;
    item.appendChild(link);
    list.appendChild(item);
  });
  tocContainer.append(title, list);
}

function initReadingProgress() {
  var bar = document.getElementById("reading-progress-bar");
  if (!bar) return;
  var scheduled = false;
  function update() {
    var root = document.documentElement;
    var range = root.scrollHeight - window.innerHeight;
    var amount = range > 0 ? Math.min(100, Math.max(0, (window.scrollY / range) * 100)) : 0;
    bar.style.width = amount + "%";
    scheduled = false;
  }
  window.addEventListener("scroll", function () {
    if (!scheduled) {
      scheduled = true;
      window.requestAnimationFrame(update);
    }
  }, { passive: true });
  update();
}
