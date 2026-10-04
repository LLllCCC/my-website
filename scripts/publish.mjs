// 把 Obsidian 里的笔记发布到自己的博客，并重新生成 feed.xml（RSS）。
//
// 用法：
//   node scripts/publish.mjs "D:\\Obsidian\\博客\\某篇文章.md"          # 发布并更新 feed.xml
//   node scripts/publish.mjs <笔记.md> --dry                            # 只解析不提交
//   node scripts/publish.mjs <笔记.md> --push                           # 顺带把 feed.xml 提交推送
//
// 管理员令牌按这个顺序找：环境变量 BLOG_ADMIN_TOKEN → ../myblog-api/.env 里的 ADMIN_TOKEN。
// 令牌不会被打印，也不会写进任何文件。
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const SITE = "https://yopoo.888431.xyz";
const API = SITE + "/api";

const argPath = process.argv.slice(2).find((a) => !a.startsWith("--"));
const dryRun = process.argv.includes("--dry");
const pushFeed = process.argv.includes("--push");
const feedOnly = process.argv.includes("--feed");

if (!argPath && !feedOnly) {
  console.error("用法：node scripts/publish.mjs <笔记.md> [--dry] [--push]");
  process.exit(1);
}

function parseNote(raw, fallbackTitle) {
  const meta = {};
  let body = raw;
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (match) {
    body = raw.slice(match[0].length);
    for (const line of match[1].split(/\r?\n/)) {
      const pair = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line.trim());
      if (pair) meta[pair[1].toLowerCase()] = pair[2].trim();
    }
  }
  const firstParagraph = body
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.replace(/[#>*`_[\]()!-]/g, "").trim())
    .find((block) => block.length > 10);
  return {
    title: meta.title || fallbackTitle,
    tags: meta.tags || "生活",
    cover: meta.cover || "",
    description: meta.description || firstParagraph || fallbackTitle,
    content: body.trim(),
  };
}

async function readToken() {
  if (process.env.BLOG_ADMIN_TOKEN?.trim()) return process.env.BLOG_ADMIN_TOKEN.trim();
  const envFile = resolve(repoRoot, "..", "myblog-api", ".env");
  if (!existsSync(envFile)) {
    throw new Error(
      "找不到管理员令牌：请设环境变量 BLOG_ADMIN_TOKEN，或在 " + envFile + " 里写 ADMIN_TOKEN=...",
    );
  }
  const text = await readFile(envFile, "utf8");
  const line = text.split(/\r?\n/).find((item) => /^\s*ADMIN_TOKEN\s*=/.test(item));
  const value = line ? line.slice(line.indexOf("=") + 1).trim() : "";
  if (!value) throw new Error(envFile + " 里没有 ADMIN_TOKEN");
  return value;
}

function escapeXml(value) {
  return String(value || "").replace(/[<>&"']/g, (ch) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[ch]),
  );
}

async function buildFeed() {
  const res = await fetch(API + "/posts", { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("读取文章列表失败：HTTP " + res.status);
  const posts = await res.json();
  const items = posts
    .slice(0, 20)
    .map((post) => {
      const link = SITE + "/post.html?id=" + encodeURIComponent(post.id);
      const date = typeof post.date === "string" ? post.date.slice(0, 10) : "";
      return [
        "    <item>",
        "      <title>" + escapeXml(post.title) + "</title>",
        "      <link>" + link + "</link>",
        "      <guid isPermaLink=\"false\">" + escapeXml(String(post.id)) + "</guid>",
        date ? "      <pubDate>" + new Date(date + "T12:00:00Z").toUTCString() + "</pubDate>" : "",
        "      <description>" + escapeXml(post.description || post.title) + "</description>",
        post.tags ? "      <category>" + escapeXml(post.tags) + "</category>" : "",
        "    </item>",
      ].filter(Boolean).join("\n");
    })
    .join("\n");

  const xml = [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "<rss version=\"2.0\">",
    "  <channel>",
    "    <title>Yopo 的博客</title>",
    "    <link>" + SITE + "/blog.html</link>",
    "    <description>自己搭的博客：代码、工具和日常。</description>",
    "    <language>zh-CN</language>",
    items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");

  await writeFile(join(repoRoot, "feed.xml"), xml, "utf8");
  return posts.length;
}

async function main() {
  if (feedOnly) {
    const total = await buildFeed();
    console.log("feed.xml 已重新生成（共 " + total + " 篇）");
    return;
  }

  const notePath = resolve(argPath);
  const raw = await readFile(notePath, "utf8");
  const fallbackTitle = notePath.split(/[\\/]/).pop().replace(/\.md$/i, "");
  const note = parseNote(raw, fallbackTitle);

  console.log("标题：" + note.title);
  console.log("标签：" + note.tags);
  console.log("摘要：" + note.description.slice(0, 40) + (note.description.length > 40 ? "…" : ""));
  console.log("正文：" + [...note.content].length + " 字");

  if (dryRun) {
    console.log("\n--dry 模式，没有提交。");
    return;
  }

  const token = await readToken();
  const res = await fetch(API + "/posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({
      title: note.title,
      content: note.content,
      tags: note.tags,
      cover: note.cover,
    }),
  });
  const result = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error("发布失败：HTTP " + res.status + " " + JSON.stringify(result));
  }

  const url = SITE + "/post.html?id=" + result.id;
  const count = await buildFeed();
  console.log("\n已发布：" + url);
  console.log("feed.xml 已更新（共 " + count + " 篇）");

  if (pushFeed) {
    await run("git", ["add", "feed.xml"], { cwd: repoRoot });
    await run("git", ["commit", "-m", "chore: 更新 RSS 订阅源"], { cwd: repoRoot }).catch(() => {
      throw new Error("feed.xml 没有变化，无需提交");
    });
    await run("git", ["push", "origin", "main"], { cwd: repoRoot });
    console.log("feed.xml 已推送，等 Actions 部署即可访问 " + SITE + "/feed.xml");
  } else {
    console.log("提示：feed.xml 需要提交推送才会上线，加 --push 自动做。");
  }
}

main().catch((error) => {
  console.error("\n" + error.message);
  process.exit(1);
});
