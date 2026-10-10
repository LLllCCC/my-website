// 归档页：按年份切换 + 按月份分组列出全部文章。
// 数据来自现有 /api/posts 列表接口，纯前端分组，不额外请求后端。
import { CONFIG, debounce, safeHttpUrl } from "./config.js?v=35";

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.map(String).join(", ");
  return typeof tags === "string" && tags.trim() ? tags : "";
}

document.addEventListener("DOMContentLoaded", async function () {
  const groupsContainer = document.getElementById("archive-groups");
  const yearsContainer = document.getElementById("archive-years");
  const searchInput = document.getElementById("archive-search");
  const resultCount = document.getElementById("archive-result-count");
  const totalCount = document.getElementById("archive-total-count");
  const yearCount = document.getElementById("archive-year-count");
  const earliestLabel = document.getElementById("archive-earliest");
  if (!groupsContainer) return;

  let allPosts = [];
  let activeYear = "all";

  function setMessage(message, isError) {
    const paragraph = document.createElement("p");
    paragraph.className = "blog-empty-state" + (isError ? " blog-empty-state--error" : "");
    paragraph.setAttribute("role", "status");
    paragraph.textContent = message;
    groupsContainer.replaceChildren(paragraph);
  }

  // 日期口径统一成 YYYY-MM-DD；缺失或无法解析的排在最后而不是被丢掉。
  function dateKeyOf(post) {
    const raw = typeof post.date === "string" ? post.date.substring(0, 10) : "";
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
  }

  function matchesKeyword(post, keyword) {
    if (!keyword) return true;
    const tags = normalizeTags(post.tags).split(",").join(" ");
    const haystack = [post.title, post.description, tags]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();
    return haystack.includes(keyword);
  }

  function buildEntry(post) {
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

    const tagValues = normalizeTags(post.tags)
      .split(",")
      .map(function (tag) {
        return tag.trim();
      })
      .filter(Boolean);

    item.append(time, link);

    if (tagValues.length) {
      const tagList = document.createElement("span");
      tagList.className = "archive-item-tags";
      tagValues.forEach(function (tag) {
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

  function render() {
    const keyword = searchInput ? searchInput.value.trim().toLocaleLowerCase() : "";

    // 先按关键词过滤，再按年份过滤，最后按日期倒序。
    const matched = allPosts.filter(function (post) {
      return matchesKeyword(post, keyword);
    });

    const visible = matched.filter(function (post) {
      if (activeYear === "all") return true;
      return dateKeyOf(post).slice(0, 4) === activeYear;
    });

    groupsContainer.replaceChildren();

    if (!visible.length) {
      setMessage(
        allPosts.length
          ? "这个筛选下没有文章，换个关键词或年份看看。"
          : "这里还没有文章，发布第一篇记录吧。",
        false
      );
      if (resultCount) {
        resultCount.textContent = allPosts.length ? "没有匹配的文章" : "暂无文章";
      }
      return;
    }

    // 按「年-月」分桶，每桶内按日期倒序。
    const buckets = new Map();
    visible.forEach(function (post) {
      const key = dateKeyOf(post).slice(0, 7) || "未知";
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(post);
    });

    Array.from(buckets.entries())
      .sort(function (a, b) {
        return a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0;
      })
      .forEach(function (entry) {
        const monthKey = entry[0];
        const posts = entry[1].slice().sort(function (a, b) {
          const timeA = Date.parse(dateKeyOf(a) + "T00:00:00") || 0;
          const timeB = Date.parse(dateKeyOf(b) + "T00:00:00") || 0;
          return timeB - timeA || Number(b.id) - Number(a.id);
        });

        const section = document.createElement("section");
        section.className = "archive-group";

        const heading = document.createElement("h2");
        heading.className = "archive-group-title";
        const [yearPart, monthPart] = monthKey.split("-");
        heading.textContent =
          yearPart && monthPart ? yearPart + " 年 " + Number(monthPart) + " 月" : "未标日期";

        const count = document.createElement("span");
        count.className = "archive-group-count";
        count.textContent = String(posts.length).padStart(2, "0") + " 篇";

        const list = document.createElement("ul");
        list.className = "archive-list";
        posts.forEach(function (post) {
          list.appendChild(buildEntry(post));
        });

        section.append(heading, count, list);
        groupsContainer.appendChild(section);
      });

    if (resultCount) {
      resultCount.textContent =
        keyword || activeYear !== "all"
          ? "找到 " + visible.length + " 篇"
          : "全部 " + visible.length + " 篇";
    }
  }

  function buildYearFilter() {
    if (!yearsContainer) return;
    yearsContainer.replaceChildren();

    const years = Array.from(
      new Set(
        allPosts
          .map(function (post) {
            return dateKeyOf(post).slice(0, 4);
          })
          .filter(Boolean)
      )
    ).sort(function (a, b) {
      return Number(b) - Number(a);
    });

    if (yearCount) yearCount.textContent = String(years.length).padStart(2, "0");

    function makeButton(label, value, isActive) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "archive-year-btn" + (isActive ? " is-active" : "");
      button.textContent = label;
      button.setAttribute("aria-pressed", String(isActive));
      button.addEventListener("click", function () {
        activeYear = value;
        yearsContainer.querySelectorAll(".archive-year-btn").forEach(function (item) {
          const active = item === button;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-pressed", String(active));
        });
        render();
      });
      return button;
    }

    yearsContainer.appendChild(makeButton("全部", "all", true));
    years.forEach(function (year) {
      yearsContainer.appendChild(makeButton(year, year, false));
    });
  }

  if (searchInput) searchInput.addEventListener("input", debounce(render, 180));

  try {
    const response = await fetch(CONFIG.POSTS_URL, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const posts = await response.json();
    if (!Array.isArray(posts)) throw new Error("Invalid response");

    allPosts = posts.filter(function (post) {
      return post && post.id != null;
    });

    if (totalCount) totalCount.textContent = String(allPosts.length).padStart(2, "0");

    const dates = allPosts.map(dateKeyOf).filter(Boolean).sort();
    if (earliestLabel) earliestLabel.textContent = dates.length ? dates[0] : "—";

    if (!allPosts.length) {
      buildYearFilter();
      setMessage("这里还没有文章，发布第一篇记录吧。");
      if (resultCount) resultCount.textContent = "暂无文章";
      return;
    }

    buildYearFilter();
    render();
  } catch (error) {
    console.error("归档加载失败:", error);
    setMessage("文章暂时无法加载，请稍后再试。", true);
    if (resultCount) resultCount.textContent = "暂时无法连接";
  }
});
