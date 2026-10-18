// 文章列表的共用构件：归档页和标签页都用同一套「一行一篇」的渲染，
// 抽出来是为了让它俩不会各自漂移（改一处两边都变）。
import { safeHttpUrl } from "./config.js?v=56";

export function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.map(String).join(", ");
  return typeof tags === "string" && tags.trim() ? tags : "";
}

export function tagValuesOf(post) {
  return normalizeTags(post && post.tags)
    .split(",")
    .map(function (tag) {
      return tag.trim();
    })
    .filter(Boolean);
}

// 日期口径统一成 YYYY-MM-DD；缺失或无法解析的返回空串（调用方负责把它排到最后，
// 而不是丢掉——文章列表少一篇比排序不完美严重得多）。
export function dateKeyOf(post) {
  const raw = post && typeof post.date === "string" ? post.date.substring(0, 10) : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
}

export function matchesKeyword(post, keyword) {
  if (!keyword) return true;
  const haystack = [post.title, post.description, normalizeTags(post.tags)]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
  return haystack.includes(keyword);
}

// 单行条目：日期 + 标题链接 + 标签 + 缩略图。
// options.excludeTag —— 当前正在看某个标签时，不必在每行重复这个标签。
export function buildPostRow(post, options) {
  const opts = options || {};
  const dateKey = dateKeyOf(post);

  const item = document.createElement("li");
  item.className = "archive-item";

  const time = document.createElement("time");
  time.className = "archive-item-date";
  time.textContent = dateKey ? dateKey.replace(/-/g, ".") : "未标日期";
  if (dateKey) time.dateTime = dateKey;

  const link = document.createElement("a");
  link.className = "archive-item-link";
  link.href = "post.html?id=" + encodeURIComponent(String(post.id));
  link.textContent =
    typeof post.title === "string" && post.title.trim() ? post.title : "未命名文章";
  link.setAttribute("aria-label", "阅读：" + link.textContent);

  item.append(time, link);

  const tags = tagValuesOf(post).filter(function (tag) {
    return tag !== opts.excludeTag;
  });
  if (tags.length) {
    const tagList = document.createElement("span");
    tagList.className = "archive-item-tags";
    tags.forEach(function (tag) {
      const chip = document.createElement("span");
      chip.className = "archive-item-tag";
      chip.textContent = tag;
      tagList.appendChild(chip);
    });
    item.appendChild(tagList);
  }

  const coverUrl = safeHttpUrl(post.cover);
  if (coverUrl) {
    const thumb = document.createElement("img");
    thumb.className = "archive-item-cover";
    thumb.src = coverUrl;
    thumb.alt = "";
    thumb.loading = "lazy";
    thumb.decoding = "async";
    item.appendChild(thumb);
  }

  return item;
}
