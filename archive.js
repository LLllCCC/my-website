// 归档页：按年份切换 + 按月份分组列出全部文章。
// 数据来自现有 /api/posts 列表接口，纯前端分组，不额外请求后端。
import { CONFIG, debounce } from "./config.js?v=44";
// 日期口径、关键词匹配、单行条目的渲染都在 postList.js 里，标签页共用同一套。
import { dateKeyOf, matchesKeyword, buildPostRow } from "./postList.js?v=44";

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

  function buildEntry(post) {
    return buildPostRow(post);
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
