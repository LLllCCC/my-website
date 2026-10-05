// 把 Obsidian 里的笔记发布到自己的博客，并重新生成 feed.xml（RSS）。
//
// 用法：
//   node scripts/publish.mjs "D:\\Obsidian\\博客\\某篇文章.md"          # 发布并更新 feed.xml
//   node scripts/publish.mjs <笔记.md> --dry                            # 只解析不提交
//   node scripts/publish.mjs <笔记.md> --push                           # 顺带把 feed.xml 提交推送
//   node scripts/publish.mjs <笔记.md> --host-images                    # 先把正文里的本地图片传图床再发
//   node scripts/publish.mjs <笔记.md> --host-images --drop-assets        # 传完把本地图挪进库的 .trash
//
// 管理员令牌按这个顺序找：环境变量 BLOG_ADMIN_TOKEN → ../myblog-api/.env 里的 ADMIN_TOKEN。
// 令牌不会被打印，也不会写进任何文件。
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { hostLocalImages, DEFAULT_ENDPOINT } from "./host-images.mjs";

const run = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const SITE = "https://yopoo.888431.xyz";
const API = SITE + "/api";

const argPath = process.argv.slice(2).find((a) => !a.startsWith("--"));
const dryRun = process.argv.includes("--dry");
const pushFeed = process.argv.includes("--push");
const feedOnly = process.argv.includes("--feed");
const hostImages = process.argv.includes("--host-images");
const dropAssets = process.argv.includes("--drop-assets");

if (!argPath && !feedOnly) {
  console.error("用法：node scripts/publish.mjs <笔记.md> [--dry] [--push]");
  process.exit(1);
}

function vaultRootOf(notePath) {
  let dir = dirname(notePath);
  for (let depth = 0; depth < 12; depth++) {
    if (existsSync(join(dir, ".obsidian"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return "";
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
    // 笔记 YAML 里的 date（YYYY-MM-DD）作为发布日期；不写就由服务器用当天。
    date: /^\d{4}-\d{2}-\d{2}$/.test((meta.date || "").trim()) ? meta.date.trim() : "",
    postId: /^\d+$/.test(meta["post-id"] || "") ? meta["post-id"] : "",
  };
}

async function readToken() {
  if (process.env.BLOG_ADMIN_TOKEN?.trim()) return process.env.BLOG_ADMIN_TOKEN.trim();
  const envFile = resolve(repoRoot, "..", "myblog-api", ".env");
  if (!existsSync(envFile)) {
    throw new Error(
      "找不到管理员令牌：请设环境变量 BLOG_ADMIN_TOKEN，或在 " + envFile + " 里写 ADMIN_TOKEN=..."
    );
  }
  const text = await readFile(envFile, "utf8");
  const line = text.split(/\r?\n/).find((item) => /^\s*ADMIN_TOKEN\s*=/.test(item));
  const value = line ? line.slice(line.indexOf("=") + 1).trim() : "";
  if (!value) throw new Error(envFile + " 里没有 ADMIN_TOKEN");
  return value;
}

function escapeXml(value) {
  return String(value || "").replace(
    /[<>&"']/g,
    (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[ch]
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
        '      <guid isPermaLink="false">' + escapeXml(String(post.id)) + "</guid>",
        date ? "      <pubDate>" + new Date(date + "T12:00:00Z").toUTCString() + "</pubDate>" : "",
        "      <description>" + escapeXml(post.description || post.title) + "</description>",
        post.tags ? "      <category>" + escapeXml(post.tags) + "</category>" : "",
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
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

function stampPostId(raw, id) {
  if (/^---\r?\n/.test(raw)) {
    if (/^post-id\s*:/m.test(raw)) return raw;
    return raw.replace(/^(---\r?\n)/, "$1post-id: " + id + "\n");
  }
  return "---\npost-id: " + id + "\n---\n\n" + raw;
}

async function main() {
  if (feedOnly) {
    const total = await buildFeed();
    console.log("feed.xml 已重新生成（共 " + total + " 篇）");
    return;
  }

  const notePath = resolve(argPath);
  let raw = await readFile(notePath, "utf8");
  let linksRewritten = false;

  if (hostImages) {
    const vaultRoot = vaultRootOf(notePath);
    const hosted = await hostLocalImages({
      text: raw,
      notePath,
      endpoint: DEFAULT_ENDPOINT,
      dryRun,
      dropAfterUpload: dropAssets,
      trashDir: vaultRoot ? join(vaultRoot, ".trash") : "",
      onProgress: (line) => console.log(line),
    });
    if (hosted.total === 0) {
      console.log("正文里没有本地图片，不用转图床。");
    } else if (dryRun) {
      console.log(
        `--dry：本地图片 ${hosted.preview.length} 张待上传，${hosted.missing.length} 张找不到文件。`
      );
    } else if (hosted.missing.length) {
      throw new Error(
        "有图片没能传到图床，已中止发布（避免发出去是死链）：\n  " + hosted.missing.join("\n  ")
      );
    } else {
      raw = hosted.text;
      linksRewritten = hosted.uploaded.length > 0;
      console.log(
        `图片已转图床：${hosted.uploaded.length}/${hosted.total} 张` +
          (hosted.moved.length ? `，${hosted.moved.length} 张本地图已挪进 .trash` : "")
      );
    }
  }

  const fallbackTitle = notePath.split(/[\\/]/).pop().replace(/\.md$/i, "");
  const note = parseNote(raw, fallbackTitle);

  console.log("标题：" + note.title);
  console.log("标签：" + note.tags);
  console.log("日期：" + (note.date || "（不填，用发布当天）"));
  console.log("摘要：" + note.description.slice(0, 40) + (note.description.length > 40 ? "…" : ""));
  console.log("正文：" + [...note.content].length + " 字");

  if (dryRun) {
    console.log("\n--dry 模式，没有提交。");
    return;
  }

  const token = await readToken();
  const res = await fetch(note.postId ? API + "/posts/" + note.postId : API + "/posts", {
    method: note.postId ? "PUT" : "POST",
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
      description: note.description,
      date: note.date,
    }),
  });
  const result = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error("发布失败：HTTP " + res.status + " " + JSON.stringify(result));
  }

  const postId = note.postId || result.id;
  const url = SITE + "/post.html?id=" + postId;
  const count = await buildFeed();
  console.log("\n" + (note.postId ? "已更新：" : "已发布：") + url);
  if (!note.postId) {
    await writeFile(notePath, stampPostId(raw, postId), "utf8");
    console.log("已把 post-id: " + postId + " 写回笔记，下次再发就是更新而不是新增。");
  } else if (linksRewritten) {
    await writeFile(notePath, raw, "utf8");
    console.log("正文里的图片链接已改写回笔记（本地路径 → 图床链接）。");
  }
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
