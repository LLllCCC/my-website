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

  initComments(postId);

  try {
    var res = await fetch(CONFIG.API_BASE + "/posts/" + postId, {
      headers: { Accept: "application/json" },
    });
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
      tagValues
        .map(function (tag) {
          return String(tag).trim();
        })
        .filter(Boolean)
        .forEach(function (tag) {
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
    var count =
      (markdownRaw.match(/[\u3400-\u9fff]/g) || []).length +
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
    if (bareMatch && isImageUrl(bareMatch[1]))
      return { url: bareMatch[1], line: lines[i], standalone: true };
  }
  var inline = markdown.match(/!\[[^\]]*\]\(<?(https?:\/\/[^\s)>]+)>?(?:\s+[^)]*)?\)/i);
  if (inline) return { url: inline[1], line: "", standalone: false };
  var urls = markdown.match(/https?:\/\/[^\s<>]+/gi) || [];
  var imageUrl = urls
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
      var trimmed = line.trim();
      var match = trimmed.match(/^(https?:\/\/\S+)$/i);
      if (!match || !isImageUrl(match[1])) return line;
      return "![](" + match[1] + ")";
    })
    .join("\n");
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
      return node.parentElement &&
        !node.parentElement.closest("a, code, pre, script, style") &&
        /https?:\/\/\S+/i.test(node.nodeValue)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
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
      if (match.index > lastIndex)
        fragment.appendChild(document.createTextNode(value.slice(lastIndex, match.index)));
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
      if (lastIndex < value.length)
        fragment.appendChild(document.createTextNode(value.slice(lastIndex)));
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
    var startX = event.clientX;
    var startY = event.clientY;
    var startPosition = { x: position.x, y: position.y };
    var rect = frame.getBoundingClientRect();
    var scale = Math.max(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
    var overflowX = Math.max(0, image.naturalWidth * scale - rect.width);
    var overflowY = Math.max(0, image.naturalHeight * scale - rect.height);

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
    item.className =
      "article-toc-item" + (heading.tagName === "H3" ? " article-toc-item--sub" : "");
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

var COMMENT_NICKNAME_KEY = "yopo-comment-nickname";
var COMMENT_NICKNAME_WORDS = {
  adjectives: ["青柠", "晚风", "雾蓝", "海盐", "雪松", "薄荷", "琥珀", "青苔", "远山", "微光"],
  nouns: ["水母", "信天翁", "柴犬", "风铃", "苔原", "云豹", "刺猬", "灯塔", "游隼", "小鹿"],
};

function randomNickname() {
  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }
  return (
    pick(COMMENT_NICKNAME_WORDS.adjectives) +
    pick(COMMENT_NICKNAME_WORDS.nouns) +
    String(100 + Math.floor(Math.random() * 900))
  );
}

function rememberedNickname() {
  try {
    var saved = localStorage.getItem(COMMENT_NICKNAME_KEY);
    var value = typeof saved === "string" ? saved.trim() : "";
    return value && [...value].length <= 30 ? value : "";
  } catch (_) {
    return "";
  }
}

function rememberNickname(value) {
  try {
    localStorage.setItem(COMMENT_NICKNAME_KEY, value);
  } catch (_) {}
}

var COMMENT_REACTION_EMOJIS = ["\u{1F44D}", "\u2764\uFE0F", "\u{1F604}", "\u{1F525}"];
var COMMENT_VISITOR_KEY = "yopo-comment-visitor";
var COMMENT_REACTION_KEY = "yopo-comment-reactions";

function randomVisitorId() {
  return window.crypto && window.crypto.randomUUID
    ? window.crypto.randomUUID()
    : String(Date.now()) + "-" + Math.random().toString(16).slice(2);
}

function visitorId() {
  try {
    var saved = localStorage.getItem(COMMENT_VISITOR_KEY);
    if (typeof saved === "string" && /^[0-9a-zA-Z-]{8,64}$/.test(saved)) return saved;
    var created = randomVisitorId();
    localStorage.setItem(COMMENT_VISITOR_KEY, created);
    return created;
  } catch (_) {
    return randomVisitorId();
  }
}

function tappedReactions() {
  try {
    var list = JSON.parse(localStorage.getItem(COMMENT_REACTION_KEY) || "[]");
    return new Set(
      Array.isArray(list)
        ? list.filter(function (item) {
            return typeof item === "string";
          })
        : []
    );
  } catch (_) {
    return new Set();
  }
}

var COMMENT_SORTS = [
  { key: "old", label: "最早" },
  { key: "new", label: "最新" },
  { key: "hot", label: "最热" },
];
var COMMENT_SORT_KEY = "yopo-comment-sort";

function savedCommentSort() {
  try {
    var saved = localStorage.getItem(COMMENT_SORT_KEY);
    return COMMENT_SORTS.some(function (item) {
      return item.key === saved;
    })
      ? saved
      : "old";
  } catch (_) {
    return "old";
  }
}

function rememberCommentSort(value) {
  try {
    localStorage.setItem(COMMENT_SORT_KEY, value);
  } catch (_) {}
}

function formatCommentDate(value) {
  if (!value) return "";
  var date = new Date(value);
  if (isNaN(date.getTime())) return "";
  function pad(part) {
    return String(part).padStart(2, "0");
  }
  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate()) +
    " " +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes())
  );
}

function initComments(postId) {
  var form = document.getElementById("comment-form");
  var nicknameField = document.getElementById("comment-nickname");
  var contentField = document.getElementById("comment-content");
  var statusField = document.getElementById("comment-status");
  var list = document.getElementById("comment-list");
  var countField = document.getElementById("comments-count");
  var submitButton = document.getElementById("comment-submit");
  var commentsUrl = CONFIG.API_BASE + "/posts/" + encodeURIComponent(postId) + "/comments";
  var sortBox = document.getElementById("comment-sort");
  if (!form || !list || !nicknameField || !contentField) return;

  var sort = savedCommentSort();
  nicknameField.value = rememberedNickname() || randomNickname();

  function setStatus(message, isError) {
    if (!statusField) return;
    statusField.textContent = message || "";
    statusField.classList.toggle("is-error", Boolean(isError));
  }

  function appendListMessage(message) {
    list.replaceChildren();
    var row = document.createElement("li");
    row.className = "comment-item comment-item--notice";
    row.textContent = message;
    list.appendChild(row);
  }

  var visitor = visitorId();
  var tapped = tappedReactions();

  function saveTapped() {
    try {
      localStorage.setItem(COMMENT_REACTION_KEY, JSON.stringify(Array.from(tapped).slice(-500)));
    } catch (_) {}
  }

  var replyingBox = document.getElementById("comment-replying");
  var replyingText = document.getElementById("comment-replying-text");
  var replyingCancel = document.getElementById("comment-replying-cancel");
  var replyingTo = null;

  function setReplying(item) {
    replyingTo = item;
    if (!replyingBox) return;
    replyingBox.hidden = !item;
    if (item && replyingText)
      replyingText.textContent = "正在回复 @" + (item.nickname || "匿名访客");
  }

  function startReply(item) {
    setReplying(replyingTo && replyingTo.id === item.id ? null : item);
    if (contentField) contentField.focus();
  }

  if (replyingCancel) {
    replyingCancel.addEventListener("click", function () {
      setReplying(null);
      if (contentField) contentField.focus();
    });
  }

  async function respond(item, emoji, button) {
    if (button.classList.contains("is-busy")) return;
    button.classList.add("is-busy");
    try {
      var res = await fetch(
        CONFIG.API_BASE + "/comments/" + encodeURIComponent(item.id) + "/reactions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ emoji: emoji, visitor: visitor }),
        }
      );
      if (!res.ok) throw new Error("HTTP " + res.status);
      var data = await res.json();
      item.reactions = Array.isArray(data.reactions) ? data.reactions : [];
      if (data.active) tapped.add(item.id + "|" + emoji);
      else tapped.delete(item.id + "|" + emoji);
      saveTapped();
      button.parentElement.replaceWith(reactionRow(item));
    } catch (err) {
      console.error("表情回应失败:", err);
      button.classList.remove("is-busy");
    }
  }

  function reactionRow(item) {
    var row = document.createElement("div");
    row.className = "comment-reactions";
    var counts = new Map();
    (item.reactions || []).forEach(function (reaction) {
      counts.set(reaction.emoji, Number(reaction.count) || 0);
    });
    COMMENT_REACTION_EMOJIS.forEach(function (emoji) {
      var count = counts.get(emoji) || 0;
      var button = document.createElement("button");
      button.type = "button";
      button.className = "comment-reaction";
      button.textContent = emoji + (count ? " " + count : "");
      button.setAttribute("aria-label", "用" + emoji + "回应，目前 " + count + " 个");
      if (tapped.has(item.id + "|" + emoji)) button.classList.add("is-tapped");
      button.addEventListener("click", function () {
        respond(item, emoji, button);
      });
      row.appendChild(button);
    });
    var reply = document.createElement("button");
    reply.type = "button";
    reply.className = "comment-reply-btn";
    reply.textContent = "回复";
    reply.addEventListener("click", function () {
      startReply(item);
    });
    row.appendChild(reply);
    return row;
  }

  function render(items) {
    list.replaceChildren();
    if (countField) countField.textContent = items.length ? " · " + items.length + " 条" : "";
    if (!items.length) {
      appendListMessage("还没有留言，可以说两句。");
      return;
    }
    items.forEach(function (item) {
      var row = document.createElement("li");
      row.className = item.parent_id ? "comment-item comment-item--reply" : "comment-item";
      var head = document.createElement("div");
      head.className = "comment-item-head";
      var name = document.createElement("span");
      name.className = "comment-item-name";
      name.textContent = item.nickname || "匿名访客";
      var time = document.createElement("time");
      time.className = "comment-item-time";
      time.textContent = formatCommentDate(item.created_at);
      head.append(name, time);
      if (item.parent_id && item.reply_to) {
        var replyTo = document.createElement("span");
        replyTo.className = "comment-item-replyto";
        replyTo.textContent = "回复 @" + item.reply_to;
        head.appendChild(replyTo);
      }
      row.append(head, renderCommentMarkdown(item.content || "", document), reactionRow(item));
      list.appendChild(row);
    });
  }

  async function load() {
    try {
      var res = await fetch(commentsUrl + "?sort=" + encodeURIComponent(sort), {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      var items = await res.json();
      render(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error(err);
      appendListMessage("评论暂时读取失败，稍后刷新页面即可。");
    }
  }

  function renderSortButtons() {
    if (!sortBox) return;
    sortBox.replaceChildren();
    COMMENT_SORTS.forEach(function (option) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "comment-sort-btn";
      button.dataset.sort = option.key;
      button.textContent = option.label;
      if (option.key === sort) {
        button.classList.add("is-active");
        button.setAttribute("aria-disabled", "true");
      }
      button.addEventListener("click", function () {
        if (sort === option.key) return;
        sort = option.key;
        rememberCommentSort(sort);
        renderSortButtons();
        load();
      });
      sortBox.appendChild(button);
    });
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    var nickname = nicknameField.value.trim();
    var content = contentField.value.trim();
    if (!nickname || !content) {
      setStatus("昵称和留言都要填写。", true);
      return;
    }

    rememberNickname(nickname);
    submitButton.disabled = true;
    setStatus("正在提交…", false);
    try {
      var res = await fetch(commentsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          nickname: nickname,
          content: content,
          parent_id: replyingTo ? replyingTo.id : null,
          website: form.website ? form.website.value : "",
        }),
      });
      if (res.status === 429) throw Object.assign(new Error("限流"), { status: 429 });
      if (res.status === 400) throw Object.assign(new Error("内容不合规"), { status: 400 });
      if (!res.ok) throw new Error("HTTP " + res.status);
      contentField.value = "";
      setStatus(
        replyingTo
          ? "已提交，通过审核后会显示在那条留言下面。"
          : "已提交，通过审核后会显示在这里。",
        false
      );
      setReplying(null);
    } catch (err) {
      console.error(err);
      setStatus(
        err.status === 429
          ? "留言太快了，请稍后再试。"
          : err.status === 400
            ? "留言太长或内容为空，改一下再提交。"
            : "提交失败，博客服务可能暂时不可用。",
        true
      );
    } finally {
      submitButton.disabled = false;
    }
  });

  renderSortButtons();
  load();
}
