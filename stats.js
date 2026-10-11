// 写作统计页：概览数字、近一年热力图、标签分布、按年汇总。
// 数据全部来自现有 /api 接口（列表 + 逐篇详情），页面只汇总、不算数。
//
// 字数口径：正文去掉代码块 / 行内代码 / 图片 / HTML 标签 / markdown 标记符后，
// 按「非空白字符数」计。中文一个字就是一个字符，这个口径对中文写作最准。
//
// 热力图窗口默认是「今天往前一年」。e2e 用 ?until=YYYY-MM-DD 把窗口钉在
// 测试数据所在的那一周——否则「哪几天该亮」的断言会依赖跑测试那天的日期，
// 过一年就全部变红。线上页面不带参数，不受影响。
import { CONFIG } from "./config.js?v=54";

const WORDS_FAILED = -1; // 详情拉取失败；区别于「这篇真是 0 字」

document.addEventListener("DOMContentLoaded", init);

async function init() {
  const endKey = windowEnd();
  renderRange(endKey);

  let posts;
  try {
    const response = await fetch(CONFIG.POSTS_URL, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("HTTP " + response.status);
    posts = await response.json();
  } catch (_) {
    setStatus("载入失败，稍后再试");
    return;
  }
  if (!Array.isArray(posts) || !posts.length) {
    setStatus("还没有文章");
    return;
  }
  setStatus("");

  const countByDay = {};
  posts.forEach(function (post) {
    const key = dateKeyOf(post && post.date);
    if (key) countByDay[key] = (countByDay[key] || 0) + 1;
  });

  // 列表一到就先渲染不依赖字数的部分，字数到位后补——感知更快。
  buildHeatmap(countByDay, endKey);
  renderOverview(posts, null);
  renderTags(posts);

  const words = await Promise.all(
    posts.map(function (post) {
      return fetchWords(post && post.id);
    })
  );
  renderOverview(posts, words);
  renderYears(posts, words);
}

/* ---------- 窗口与日期 ---------- */

// 终点日：?until=YYYY-MM-DD（合法才采用），否则今天（本地时区）。
function windowEnd() {
  const raw = new URLSearchParams(window.location.search).get("until") || "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw) && !isNaN(new Date(raw + "T00:00:00").getTime())) {
    return raw;
  }
  const now = new Date();
  return (
    now.getFullYear() +
    "-" +
    String(now.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(now.getDate()).padStart(2, "0")
  );
}

// 统一取 YYYY-MM-DD；缺失或无法解析的返回空串（调用方跳过，不丢页）。
function dateKeyOf(value) {
  const raw = typeof value === "string" ? value.slice(0, 10) : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
}

function parseLocalDate(key) {
  return new Date(key + "T00:00:00");
}

/* ---------- 渲染 ---------- */

function setStatus(text) {
  const box = document.getElementById("stats-status");
  if (!box) return;
  box.textContent = text;
  box.hidden = !text;
}

function renderRange(endKey) {
  const start = parseLocalDate(endKey);
  start.setDate(start.getDate() - 364);
  const box = document.getElementById("stats-range");
  if (box) {
    box.textContent =
      start.getFullYear() +
      "-" +
      String(start.getMonth() + 1).padStart(2, "0") +
      " ~ " +
      endKey.slice(0, 7);
  }
}

function renderOverview(posts, words) {
  const tagSet = new Set();
  let comments = 0;
  let wordsTotal = 0;
  let wordsIncomplete = false;

  posts.forEach(function (post, index) {
    const raw = Array.isArray(post && post.tags)
      ? post.tags.map(String)
      : String((post && post.tags) || "");
    raw
      .split(",")
      .map(function (tag) {
        return tag.trim();
      })
      .filter(Boolean)
      .forEach(function (tag) {
        tagSet.add(tag);
      });
    comments += Number(post && post.comment_count) || 0;
    if (words) {
      const value = words[index];
      if (value === WORDS_FAILED) wordsIncomplete = true;
      else wordsTotal += value;
    }
  });

  fill("#stat-posts", posts.length);
  fill("#stat-comments", comments);
  fill("#stat-tags", tagSet.size);
  if (!words) return; // 字数还在路上
  fill("#stat-words", wordsTotal === 0 && wordsIncomplete ? null : wordsTotal);

  function fill(selector, value) {
    const box = document.querySelector(selector);
    if (box) box.textContent = value == null ? "—" : value.toLocaleString("zh-CN");
  }
}

// 热力图：列 = 周（周一起），行 = 周一～周日。窗口固定 365 天，
// 起点再对齐到周一，所以格子数稳定（371 上下），列数不随今天星期几漂移。
function buildHeatmap(countByDay, endKey) {
  const cellsBox = document.getElementById("heatmap-cells");
  const monthsBox = document.getElementById("heatmap-months");
  if (!cellsBox || !monthsBox) return;

  const end = parseLocalDate(endKey);
  const start = parseLocalDate(endKey);
  start.setDate(start.getDate() - 364);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // 退到周一

  const keyOf = function (date) {
    return (
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(date.getDate()).padStart(2, "0")
    );
  };

  const weeks = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      if (cursor > end) break;
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  // 月份标签落在「该月第一次出现」的那一列。
  const monthMarks = [];
  let prevMonth = -1;
  weeks.forEach(function (week, wi) {
    week.forEach(function (day) {
      const month = day.getMonth();
      if (month !== prevMonth) {
        monthMarks.push({ wi: wi, label: month + 1 + "月" });
        prevMonth = month;
      }
    });
  });

  const cells = document.createDocumentFragment();
  weeks.forEach(function (week) {
    week.forEach(function (day) {
      const key = keyOf(day);
      const cell = document.createElement("span");
      const count = countByDay[key] || 0;
      if (count) {
        cell.dataset.level = String(Math.min(count, 3));
        cell.title = key + " · " + count + " 篇";
      }
      cells.appendChild(cell);
    });
  });

  const months = document.createDocumentFragment();
  weeks.forEach(function (_, wi) {
    const slot = document.createElement("span");
    const mark = monthMarks.find(function (m) {
      return m.wi === wi;
    });
    if (mark) slot.textContent = mark.label;
    months.appendChild(slot);
  });

  cellsBox.replaceChildren(cells);
  monthsBox.replaceChildren(months);
}

function renderTags(posts) {
  const box = document.getElementById("stats-tags");
  if (!box) return;

  const counts = new Map();
  posts.forEach(function (post) {
    const raw = Array.isArray(post && post.tags)
      ? post.tags.map(String)
      : String((post && post.tags) || "");
    raw
      .split(",")
      .map(function (tag) {
        return tag.trim();
      })
      .filter(Boolean)
      .forEach(function (tag) {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      });
  });

  const sorted = [...counts.entries()].sort(function (a, b) {
    return b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN");
  });
  const max = sorted.length ? sorted[0][1] : 1;

  const fragment = document.createDocumentFragment();
  sorted.forEach(function (entry) {
    const row = document.createElement("div");
    row.className = "stats-tag-row";

    const name = document.createElement("span");
    name.className = "stats-tag-name";
    name.textContent = entry[0];

    const track = document.createElement("span");
    track.className = "stats-tag-track";
    const bar = document.createElement("span");
    bar.className = "stats-tag-bar";
    bar.style.width = Math.round((entry[1] / max) * 100) + "%";
    track.appendChild(bar);

    const count = document.createElement("span");
    count.className = "stats-tag-count";
    count.textContent = String(entry[1]);

    row.append(name, track, count);
    fragment.appendChild(row);
  });
  box.replaceChildren(fragment);
}

function renderYears(posts, words) {
  const box = document.getElementById("stats-years");
  if (!box) return;

  const byYear = new Map();
  posts.forEach(function (post, index) {
    const key = dateKeyOf(post && post.date);
    if (!key) return;
    const year = key.slice(0, 4);
    const entry = byYear.get(year) || { count: 0, words: 0 };
    entry.count += 1;
    if (words && words[index] !== WORDS_FAILED) entry.words += words[index];
    byYear.set(year, entry);
  });

  const fragment = document.createDocumentFragment();
  [...byYear.entries()]
    .sort(function (a, b) {
      return b[0].localeCompare(a[0]);
    })
    .forEach(function (entry) {
      const row = document.createElement("div");
      row.className = "stats-year-row";

      const year = document.createElement("span");
      year.className = "stats-year";
      year.textContent = entry[0];

      const meta = document.createElement("span");
      meta.className = "stats-year-meta";
      const wordsSpan = document.createElement("span");
      wordsSpan.className = "stats-year-words";
      wordsSpan.textContent = entry[1].words.toLocaleString("zh-CN");
      meta.append(wordsSpan, document.createTextNode(" 字 · " + entry[1].count + " 篇"));

      row.append(year, meta);
      fragment.appendChild(row);
    });
  box.replaceChildren(fragment);
}

/* ---------- 字数 ---------- */

async function fetchWords(postId) {
  if (postId == null) return WORDS_FAILED;
  try {
    const response = await fetch(CONFIG.API_BASE + "/posts/" + encodeURIComponent(String(postId)), {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return WORDS_FAILED;
    const data = await response.json();
    return countWords(data && data.content);
  } catch (_) {
    return WORDS_FAILED;
  }
}

function countWords(markdown) {
  if (typeof markdown !== "string" || !markdown.trim()) return 0;
  let text = markdown;
  text = text.replace(/```[\s\S]*?```/g, " "); // 围栏代码块
  text = text.replace(/`[^`\n]*`/g, " "); // 行内代码
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, " "); // 图片
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1"); // 链接保留文字
  text = text.replace(/<[^>]+>/g, " "); // HTML 标签
  text = text.replace(/[#>*_~|]+/g, " "); // markdown 标记符
  return text.replace(/\s+/g, "").length;
}
