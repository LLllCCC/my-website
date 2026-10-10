// 文章详情页：拉取正文、Markdown 渲染、封面定位、目录、阅读进度。
// 另含：代码高亮与复制、图片灯箱、上一篇/下一篇、文章级表情回应、JSON-LD。
// 评论区逻辑在 comments.js，不要在这里加评论相关代码。
import { CONFIG, safeHttpUrl, showToast } from "./config.js?v=37";
import { initComments, visitorId } from "./comments.js?v=37";

document.addEventListener("DOMContentLoaded", async function () {
  const postId = new URLSearchParams(window.location.search).get("id");
  const articleTitle = document.getElementById("article-title");
  const articleBody = document.getElementById("article-body");

  function showMessage(message) {
    if (articleBody) articleBody.textContent = message;
  }

  if (!postId || !/^\d+$/.test(postId)) {
    showMessage("文章链接无效或缺少文章编号。");
    return;
  }

  initComments(postId);

  try {
    const res = await fetch(CONFIG.API_BASE + "/posts/" + postId, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const post = await res.json();

    document.title = (post.title || "博客文章") + " - Yopo";
    if (articleTitle) articleTitle.textContent = post.title || "未命名文章";
    const dateValue = typeof post.date === "string" ? post.date.substring(0, 10) : "";
    const date = document.getElementById("article-date");
    if (date) {
      date.textContent = dateValue.replace(/-/g, " / ");
      if (dateValue) date.dateTime = dateValue;
    }
    const tags = document.getElementById("article-tags");
    if (tags) {
      const tagValues = Array.isArray(post.tags) ? post.tags : String(post.tags || "").split(",");
      tagValues
        .map(function (tag) {
          return String(tag).trim();
        })
        .filter(Boolean)
        .forEach(function (tag) {
          const chip = document.createElement("span");
          chip.className = "article-tag";
          chip.textContent = tag;
          tags.appendChild(chip);
        });
    }

    let markdownRaw = post.content || "这篇文章还没有正文内容哦。";
    markdownRaw = joinWrappedImageUrls(markdownRaw);
    const coverFromBody = findFirstMarkdownImage(markdownRaw);
    const coverUrl = safeHttpUrl(post.cover) || (coverFromBody && safeHttpUrl(coverFromBody.url));
    const cover = document.getElementById("article-cover");
    const coverImage = document.getElementById("article-cover-image");
    if (cover && coverUrl) {
      coverImage.alt = (post.title || "文章") + " 封面";
      coverImage.addEventListener(
        "load",
        function () {
          cover.querySelector(".article-hero-cover-backdrop").style.backgroundImage =
            "url(" + JSON.stringify(coverUrl) + ")";
          cover.hidden = false;
          enableCoverReposition(cover, coverImage, postId);
        },
        { once: true }
      );
      coverImage.addEventListener(
        "error",
        function () {
          cover.hidden = true;
        },
        { once: true }
      );
      coverImage.src = coverUrl;
    }
    markdownRaw = convertBareImageLinks(markdownRaw);
    const count =
      (markdownRaw.match(/[\u3400-\u9fff]/g) || []).length +
      (markdownRaw.match(/[A-Za-z0-9]+/g) || []).length;
    const minutes = Math.max(1, Math.ceil(count / 450));
    const readTime = document.getElementById("article-read-time");
    if (readTime) readTime.textContent = "约 " + minutes + " 分钟阅读";

    if (articleBody && window.marked && window.DOMPurify) {
      articleBody.innerHTML = DOMPurify.sanitize(marked.parse(markdownRaw));
      replaceImageLinks(articleBody);
      buildTOC(articleBody);
      initTOCScrollSpy(articleBody);
      initReadingProgress();
      renderNeighbors(post);
      initRelatedPosts(post);
      initArticleReactions(postId);
      injectArticleJsonLd(post);
      enhanceCodeBlocks(articleBody);
      initLightbox(articleBody);
      initContentReveal(articleBody);
    } else {
      showMessage("文章格式组件暂时不可用，请刷新页面重试。");
    }
  } catch (err) {
    console.error(err);
    showMessage("文章加载失败，请稍后重试；如果问题持续，请检查博客服务是否运行。");
  }
});

function isImageUrl(value) {
  try {
    const pathname = new URL(value, window.location.href).pathname;
    return /\.(?:avif|gif|jpe?g|png|svg|webp|bmp)$/i.test(pathname);
  } catch (_) {
    return false;
  }
}

function joinWrappedImageUrls(markdown) {
  const lines = markdown.split(/\r?\n/);
  const output = [];
  for (let i = 0; i < lines.length; i++) {
    const current = lines[i].trim();
    if (!/^https?:\/\/\S+$/i.test(current) || isImageUrl(current)) {
      output.push(lines[i]);
      continue;
    }
    let combined = current;
    let joined = false;
    for (let next = i + 1; next < lines.length && next <= i + 4; next++) {
      const continuation = lines[next].trim();
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
  const lines = markdown.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const markdownMatch = line.match(/^!\[[^\]]*\]\(<?(https?:\/\/[^\s)>]+)>?(?:\s+[^)]*)?\)$/i);
    if (markdownMatch) return { url: markdownMatch[1], line: lines[i], standalone: true };
    const bareMatch = line.match(/^(https?:\/\/\S+)$/i);
    if (bareMatch && isImageUrl(bareMatch[1]))
      return { url: bareMatch[1], line: lines[i], standalone: true };
  }
  const inline = markdown.match(/!\[[^\]]*\]\(<?(https?:\/\/[^\s)>]+)>?(?:\s+[^)]*)?\)/i);
  if (inline) return { url: inline[1], line: "", standalone: false };
  const urls = markdown.match(/https?:\/\/[^\s<>]+/gi) || [];
  const imageUrl = urls
    .map(function (url) {
      return url.replace(/[.,;!?]+$/, "");
    })
    .find(isImageUrl);
  return imageUrl ? { url: imageUrl, line: "", standalone: false } : null;
}

function convertBareImageLinks(markdown) {
  return markdown
    .split(/\r?\n/)
    .map(function (line) {
      const trimmed = line.trim();
      const match = trimmed.match(/^(https?:\/\/\S+)$/i);
      if (!match || !isImageUrl(match[1])) return line;
      return "![](" + match[1] + ")";
    })
    .join("\n");
}

function replaceImageLinks(articleBody) {
  articleBody.querySelectorAll("a[href]").forEach(function (link) {
    const imageUrl = safeHttpUrl(link.href);
    if (!imageUrl || !isImageUrl(imageUrl)) return;
    const label = link.textContent.trim();
    const labelIsUrl = /^https?:\/\//i.test(label);
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = labelIsUrl ? "文章图片" : label || "文章图片";
    image.loading = "lazy";
    image.decoding = "async";
    link.replaceWith(image);
  });

  const walker = document.createTreeWalker(articleBody, NodeFilter.SHOW_TEXT, {
    acceptNode: function (node) {
      return node.parentElement &&
        !node.parentElement.closest("a, code, pre, script, style") &&
        /https?:\/\/\S+/i.test(node.nodeValue)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach(function (node) {
    const value = node.nodeValue;
    const pattern = /https?:\/\/[^\s<>"']+/gi;
    let match;
    let lastIndex = 0;
    const fragment = document.createDocumentFragment();
    let replaced = false;
    while ((match = pattern.exec(value))) {
      const candidate = match[0].replace(/[.,;!?]+$/, "");
      const imageUrl = safeHttpUrl(candidate);
      if (!imageUrl || !isImageUrl(imageUrl)) continue;
      if (match.index > lastIndex)
        fragment.appendChild(document.createTextNode(value.slice(lastIndex, match.index)));
      const image = document.createElement("img");
      image.src = imageUrl;
      image.alt = "文章图片";
      image.loading = "lazy";
      image.decoding = "async";
      fragment.appendChild(image);
      lastIndex = match.index + candidate.length;
      replaced = true;
    }
    if (replaced) {
      if (lastIndex < value.length)
        fragment.appendChild(document.createTextNode(value.slice(lastIndex)));
      node.replaceWith(fragment);
    }
  });
}

function enableCoverReposition(frame, image, postId) {
  const storageKey = "yopo-cover-position-" + postId;
  const position = { x: 50, y: 50 };
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
      position.x = saved.x;
      position.y = saved.y;
    }
  } catch (_) {}

  function renderPosition() {
    image.style.objectPosition = position.x + "% " + position.y + "%";
  }
  function savePosition() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(position));
    } catch (_) {}
  }
  function clamp(value) {
    return Math.max(0, Math.min(100, value));
  }
  function drag(event) {
    if (event.button !== 0) return;
    event.preventDefault();
    frame.setPointerCapture(event.pointerId);
    frame.classList.add("is-dragging-cover");
    const startX = event.clientX;
    const startY = event.clientY;
    const startPosition = { x: position.x, y: position.y };
    const rect = frame.getBoundingClientRect();
    const scale = Math.max(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
    const overflowX = Math.max(0, image.naturalWidth * scale - rect.width);
    const overflowY = Math.max(0, image.naturalHeight * scale - rect.height);

    function move(moveEvent) {
      position.x = overflowX
        ? clamp(startPosition.x - ((moveEvent.clientX - startX) / overflowX) * 100)
        : 50;
      position.y = overflowY
        ? clamp(startPosition.y - ((moveEvent.clientY - startY) / overflowY) * 100)
        : 50;
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
    const step = event.shiftKey ? 10 : 3;
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
  const tocContainer = document.getElementById("article-toc");
  if (!tocContainer) return;
  const headings = articleBody.querySelectorAll("h2, h3");
  if (headings.length < 2) {
    tocContainer.hidden = true;
    return;
  }
  headings.forEach(function (heading, index) {
    if (!heading.id) heading.id = "heading-" + index;
  });
  const title = document.createElement("div");
  title.className = "article-toc-title";
  title.textContent = "本文目录";
  tocContainer.appendChild(title);
  const list = document.createElement("ul");
  list.className = "article-toc-list";
  headings.forEach(function (heading) {
    const item = document.createElement("li");
    item.className =
      "article-toc-item" + (heading.tagName === "H3" ? " article-toc-item--sub" : "");
    const link = document.createElement("a");
    link.href = "#" + heading.id;
    link.textContent = heading.textContent;
    item.appendChild(link);
    list.appendChild(item);
  });
  tocContainer.append(title, list);
}

function initReadingProgress() {
  const bar = document.getElementById("reading-progress-bar");
  if (!bar) return;
  let scheduled = false;
  function update() {
    const root = document.documentElement;
    const range = root.scrollHeight - window.innerHeight;
    const amount = range > 0 ? Math.min(100, Math.max(0, (window.scrollY / range) * 100)) : 0;
    bar.style.width = amount + "%";
    scheduled = false;
  }
  window.addEventListener(
    "scroll",
    function () {
      if (!scheduled) {
        scheduled = true;
        window.requestAnimationFrame(update);
      }
    },
    { passive: true }
  );
  update();
}

// 让目录随滚动高亮当前章节。
// 与 buildTOC 的产出一一对应：buildTOC 按 articleBody 里 h2/h3 的文档顺序生成链接，
// 这里用同一个顺序取标题，所以 links[i] 与 headings[i] 必然指向同一节。
function initTOCScrollSpy(articleBody) {
  const tocContainer = document.getElementById("article-toc");
  if (!tocContainer || tocContainer.hidden) return;
  const links = Array.prototype.slice.call(tocContainer.querySelectorAll(".article-toc-item a"));
  const headings = Array.prototype.slice.call(articleBody.querySelectorAll("h2, h3"));
  if (!links.length || links.length !== headings.length) return;

  // 顶栏是 fixed 的，阈值要留出它的高度，否则"当前章节"总比视觉上慢一拍
  const OFFSET = 140;
  let activeIndex = -1;
  let scheduled = false;

  function apply(index) {
    if (index === activeIndex) return;
    activeIndex = index;
    links.forEach(function (link, i) {
      if (i === index) {
        link.classList.add("is-active");
        link.setAttribute("aria-current", "true");
      } else {
        link.classList.remove("is-active");
        link.removeAttribute("aria-current");
      }
    });
  }

  function update() {
    scheduled = false;
    let index = 0;
    for (let i = 0; i < headings.length; i++) {
      if (headings[i].getBoundingClientRect().top - OFFSET <= 0) index = i;
      else break;
    }
    // 滚到底部时强制选中最后一节：末尾几节可能永远到不了阈值线
    const root = document.documentElement;
    if (window.innerHeight + window.scrollY >= root.scrollHeight - 2) {
      index = headings.length - 1;
    }
    apply(index);
  }

  function schedule() {
    if (!scheduled) {
      scheduled = true;
      window.requestAnimationFrame(update);
    }
  }

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  update();
}

// 正文元素滚动渐入。正文由 JS 渲染，所以不需要 no-JS 兜底——元素存在即说明 JS 在跑；
// 但"减少动效"必须尊重，不满足就直接整段跳过，连类都不加。
function initContentReveal(articleBody) {
  if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
  if (!("IntersectionObserver" in window)) return;

  // 只选块级元素：图片多包在 <p> 或 <figure> 里，单独动一个行内元素会很怪
  const targets = Array.prototype.slice.call(
    articleBody.querySelectorAll("pre, blockquote, figure, table")
  );
  if (!targets.length) return;

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    },
    // 观察区往下扩 8% = 提前揭示。用负边距（"进视口后再等一会儿"）会让
    // 正好卡在折叠线上的元素一直不揭示，留出一段空白，看起来像内容丢了。
    { rootMargin: "0px 0px 8% 0px", threshold: 0 }
  );

  targets.forEach(function (el) {
    // 首屏里已有的元素不参与：给它们加初始位移，反而会让首屏抖一下
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    el.classList.add("content-reveal");
    observer.observe(el);
  });
}

function renderNeighbors(post) {
  const box = document.getElementById("article-neighbors");
  if (!box) return;
  const links = [
    { label: "← 上一篇", post: post.older, extra: "article-neighbor--older" },
    { label: "下一篇 →", post: post.newer, extra: "article-neighbor--newer" },
  ].filter(function (item) {
    return item.post && Number(item.post.id) > 0;
  });
  if (!links.length) return;
  box.hidden = false;
  links.forEach(function (item) {
    const link = document.createElement("a");
    link.className = "article-neighbor " + item.extra;
    link.href = "post.html?id=" + encodeURIComponent(String(item.post.id));
    const label = document.createElement("span");
    label.className = "article-neighbor-label";
    label.textContent = item.label;
    const title = document.createElement("span");
    title.className = "article-neighbor-title";
    title.textContent = String(item.post.title || "无标题文章");
    link.append(label, title);
    box.appendChild(link);
  });
}

// 相关阅读：按共同标签数排序，从列表接口里取最近几篇同主题的文章。
// 整栏拿不到数据或没有共同标签时就不显示，不影响正文与评论。
const RELATED_MAX = 3;

function tagSetOf(value) {
  const raw = Array.isArray(value) ? value.map(String) : String(value || "").split(",");
  return new Set(
    raw
      .map(function (tag) {
        return tag.trim();
      })
      .filter(Boolean)
  );
}

async function initRelatedPosts(post) {
  const box = document.getElementById("article-related");
  if (!box) return;

  const currentId = String(post.id);
  const currentTags = tagSetOf(post.tags);
  if (!currentTags.size) return;

  try {
    const response = await fetch(CONFIG.POSTS_URL, { headers: { Accept: "application/json" } });
    if (!response.ok) return;
    const posts = await response.json();
    if (!Array.isArray(posts)) return;

    const scored = posts
      .filter(function (item) {
        return item && item.id != null && String(item.id) !== currentId;
      })
      .map(function (item) {
        const tags = tagSetOf(item.tags);
        let shared = 0;
        tags.forEach(function (tag) {
          if (currentTags.has(tag)) shared += 1;
        });
        return { post: item, shared: shared };
      })
      .filter(function (item) {
        return item.shared > 0;
      })
      .sort(function (a, b) {
        const timeA = Date.parse(a.post.date || "") || 0;
        const timeB = Date.parse(b.post.date || "") || 0;
        return b.shared - a.shared || timeB - timeA || Number(b.post.id) - Number(a.post.id);
      })
      .slice(0, RELATED_MAX);

    if (!scored.length) return;

    const heading = document.createElement("h2");
    heading.className = "article-related-title";
    heading.textContent = "相关阅读";

    const list = document.createElement("ul");
    list.className = "article-related-list";

    scored.forEach(function (item) {
      const entry = item.post;
      const row = document.createElement("li");
      row.className = "article-related-item";

      const link = document.createElement("a");
      link.className = "article-related-link";
      link.href = "post.html?id=" + encodeURIComponent(String(entry.id));
      link.textContent =
        typeof entry.title === "string" && entry.title.trim() ? entry.title : "未命名文章";

      const sharedTags = Array.from(tagSetOf(entry.tags))
        .filter(function (tag) {
          return currentTags.has(tag);
        })
        .slice(0, 3);

      const meta = document.createElement("span");
      meta.className = "article-related-meta";
      const dateKey = typeof entry.date === "string" ? entry.date.substring(0, 10) : "";
      if (dateKey) {
        const time = document.createElement("time");
        time.className = "article-related-date";
        time.textContent = dateKey.replace(/-/g, " / ");
        time.dateTime = dateKey;
        meta.appendChild(time);
      }
      if (sharedTags.length) {
        const tagList = document.createElement("span");
        tagList.className = "article-related-tags";
        sharedTags.forEach(function (tag) {
          const chip = document.createElement("span");
          chip.className = "article-related-tag";
          chip.textContent = tag;
          tagList.appendChild(chip);
        });
        meta.appendChild(tagList);
      }

      row.append(link, meta);
      list.appendChild(row);
    });

    box.replaceChildren(heading, list);
    box.hidden = false;
  } catch (error) {
    console.warn("相关阅读未能加载:", error);
  }
}

// 文章级表情回应：身份与计数口径都和评论区一致（visitor 的 sha256 + localStorage 记录点过哪些）。
// 加载失败（比如文章回应表还没建）就整栏不显示，不影响正文和评论。
const POST_REACTION_EMOJIS = ["\u{1F44D}", "\u2764\uFE0F", "\u{1F604}", "\u{1F525}"];
const POST_REACTION_KEY = "yopo-post-reactions";

function tappedPostReactions() {
  try {
    const list = JSON.parse(localStorage.getItem(POST_REACTION_KEY) || "[]");
    return new Set(Array.isArray(list) ? list.filter((item) => typeof item === "string") : []);
  } catch (_) {
    return new Set();
  }
}

async function initArticleReactions(postId) {
  const box = document.getElementById("article-reactions");
  if (!box) return;
  const reactionsUrl =
    CONFIG.API_BASE + "/posts/" + encodeURIComponent(String(postId)) + "/reactions";
  const key = String(postId) + "|";
  let counts = new Map();
  const tapped = tappedPostReactions();

  function saveTapped() {
    try {
      localStorage.setItem(POST_REACTION_KEY, JSON.stringify(Array.from(tapped).slice(-500)));
    } catch (_) {}
  }

  function render() {
    box.replaceChildren();
    POST_REACTION_EMOJIS.forEach(function (emoji) {
      const count = counts.get(emoji) || 0;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "article-reaction" + (tapped.has(key + emoji) ? " is-tapped" : "");
      button.textContent = emoji + (count ? " " + count : "");
      button.setAttribute("aria-label", "用" + emoji + "回应这篇文章，目前 " + count + " 个");
      button.addEventListener("click", function () {
        toggle(emoji, button);
      });
      box.appendChild(button);
    });
  }

  async function toggle(emoji, button) {
    if (button.classList.contains("is-busy")) return;
    button.classList.add("is-busy");
    try {
      const res = await fetch(reactionsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ emoji: emoji, visitor: visitorId() }),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      counts = new Map(
        (Array.isArray(data.reactions) ? data.reactions : []).map(function (reaction) {
          return [reaction.emoji, Number(reaction.count) || 0];
        })
      );
      if (data.active) tapped.add(key + emoji);
      else tapped.delete(key + emoji);
      saveTapped();
      render();
    } catch (err) {
      console.error("文章表情回应失败:", err);
      button.classList.remove("is-busy");
    }
  }

  try {
    const res = await fetch(reactionsUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    counts = new Map(
      (Array.isArray(data.reactions) ? data.reactions : []).map(function (reaction) {
        return [reaction.emoji, Number(reaction.count) || 0];
      })
    );
    box.hidden = false;
    render();
  } catch (err) {
    console.error("文章表情回应加载失败:", err);
  }
}

// 给爬虫补一份结构化数据（真人无感知）；爬虫版 meta 由后端 /api/render/post 提供。
function injectArticleJsonLd(post) {
  const published = typeof post.date === "string" ? post.date.slice(0, 10) : "";
  const data = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title || "未命名文章",
    description: post.description || "",
    datePublished: published || undefined,
    image: safeHttpUrl(post.cover) || undefined,
    author: { "@type": "Person", name: "Yopo" },
    mainEntityOfPage: window.location.href,
  };
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(data).replace(/</g, "\\u003c");
  document.head.appendChild(script);
}

function enhanceCodeBlocks(articleBody) {
  articleBody.querySelectorAll("pre code").forEach(function (code) {
    if (window.hljs && !code.dataset.highlighted) {
      try {
        window.hljs.highlightElement(code);
      } catch (_) {
        // 高亮失败不影响代码本身的展示。
      }
    }
  });
  articleBody.querySelectorAll("pre").forEach(function (pre) {
    if (pre.querySelector(".code-copy-btn")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "code-copy-btn";
    button.textContent = "复制";
    button.setAttribute("aria-label", "复制代码");
    button.addEventListener("click", async function () {
      const code = pre.querySelector("code");
      const text = (code ? code.textContent : pre.textContent) || "";
      try {
        await navigator.clipboard.writeText(text);
        button.textContent = "已复制";
        showToast("代码已复制");
      } catch (err) {
        console.error("复制代码失败:", err);
        button.textContent = "复制失败";
      }
      setTimeout(function () {
        button.textContent = "复制";
      }, 1800);
    });
    pre.appendChild(button);
  });
}

function initLightbox(articleBody) {
  const images = articleBody.querySelectorAll("img");
  if (!images.length) return;
  let overlay = null;

  function close() {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    document.documentElement.classList.remove("lightbox-open");
    document.removeEventListener("keydown", onKey);
  }
  function onKey(event) {
    if (event.key === "Escape") close();
  }
  function open(src, alt) {
    close();
    overlay = document.createElement("div");
    overlay.className = "lightbox-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "查看大图，点击任意位置关闭");
    const image = document.createElement("img");
    image.src = src;
    image.alt = alt || "文章图片大图";
    overlay.appendChild(image);
    overlay.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    document.body.appendChild(overlay);
    document.documentElement.classList.add("lightbox-open");
  }

  images.forEach(function (image) {
    image.classList.add("lightboxable");
    image.addEventListener("click", function () {
      const src = safeHttpUrl(image.currentSrc || image.src);
      if (src) open(src, image.alt);
    });
  });
}
