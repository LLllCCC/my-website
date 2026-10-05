// 发布前把笔记里的本地图片上传到 PicList 图床，并用返回的链接改写正文。
//
// 为什么需要它：剪藏下来的文章图片是库里的本地文件，博客服务器看不到这些文件。
// 走本地图上传还有个附带好处：不依赖网站图片的可访问性（少数派、t66y 的图直接按 URL 抓会 403/404）。
//
// 单张一次请求，不按批量传：PicList 上传失败的项会从 result 里被过滤掉，
// 批量时返回数组会比输入短，就没法把 URL 对回原来的文件。
import { existsSync } from "node:fs";
import { mkdir, rename } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

export const DEFAULT_ENDPOINT = "http://127.0.0.1:36678/upload?picbed=github&configName=tuchang";

const IMAGE_RE = /!\[[^\]]*\]\(\s*(<[^>]*>|[^)\s]+)(?:\s+"[^"]*")?\s*\)/g;

function parseTarget(inner) {
  const raw = inner.replace(/^<|>$/g, "").trim();
  return { raw, remote: /^(https?:|data:|obsidian:|\/\/)/i.test(raw) };
}

function localTargets(text) {
  const list = [];
  for (const match of text.matchAll(IMAGE_RE)) {
    const { raw, remote } = parseTarget(match[1]);
    if (!remote && raw && !list.includes(raw)) list.push(raw);
  }
  return list;
}

// PicList 传的是本地路径，文件名会带上原名字（自动重命名开启时改为时间戳）。
async function uploadOne(absPath, endpoint) {
  let lastError = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ list: [absPath] }),
        signal: AbortSignal.timeout(120000),
      });
      const data = await res.json().catch(() => null);
      const url = Array.isArray(data?.result) ? data.result[0] : "";
      if (res.ok && data?.success && /^https?:\/\//i.test(url)) return { url };
      lastError = `HTTP ${res.status} ${JSON.stringify(data).slice(0, 120)}`;
    } catch (error) {
      lastError = `${error.name} ${String(error.message).slice(0, 80)}`;
    }
    if (attempt < 2) await new Promise((done) => setTimeout(done, 1500));
  }
  return { error: lastError };
}

// 上传成功的本地图挪进 Obsidian 的 .trash，跟应用内删除同一个效果，不硬删。
// 名字撞车就加时间戳；挪不动（文件被占用）就留在原地，下次再管。
async function toTrash(absPath, trashDir) {
  await mkdir(trashDir, { recursive: true });
  const name = basename(absPath);
  let target = resolve(trashDir, name);
  if (existsSync(target)) target = resolve(trashDir, `${Date.now()}-${name}`);
  try {
    await rename(absPath, target);
    return target;
  } catch {
    return "";
  }
}

// 简悦写进正文的路径可能带 URL 编码的空格（%20），按原文找不到时再按解码后的找一次
function decodeTarget(noteDir, target) {
  if (!target.includes("%")) return "";
  try {
    return resolve(noteDir, decodeURIComponent(target));
  } catch {
    return "";
  }
}

export async function hostLocalImages({
  text,
  notePath,
  endpoint = DEFAULT_ENDPOINT,
  dryRun = false,
  dropAfterUpload = false,
  trashDir = "",
  onProgress = () => {},
}) {
  const noteDir = dirname(resolve(notePath));
  const targets = localTargets(text);
  if (targets.length === 0)
    return { text, total: 0, uploaded: [], missing: [], moved: [], dry: dryRun };

  const resolved = targets.map((target) => {
    const plain = resolve(noteDir, target);
    const decoded = decodeTarget(noteDir, target);
    const abs = !decoded || existsSync(plain) ? plain : decoded;
    return { target, abs, ok: existsSync(abs) };
  });

  if (dryRun) {
    return {
      text,
      total: resolved.length,
      uploaded: [],
      missing: resolved.filter((item) => !item.ok).map((item) => item.target),
      moved: [],
      dry: true,
      preview: resolved.filter((item) => item.ok).map((item) => item.abs),
    };
  }

  const urls = new Map();
  const missing = [];
  const moved = [];
  for (const item of resolved) {
    if (!item.ok) {
      missing.push(`本地文件不存在：${item.target}`);
      continue;
    }
    const { url, error } = await uploadOne(item.abs, endpoint);
    if (!url) {
      missing.push(`上传失败：${item.target}（${error}）`);
      onProgress(`✗ ${basename(item.abs)} ${error}`);
      continue;
    }
    urls.set(item.target, url);
    onProgress(`✓ ${basename(item.abs)} → ${url}`);
    if (dropAfterUpload && trashDir) moved.push(await toTrash(item.abs, trashDir));
  }

  const rewritten = text.replace(IMAGE_RE, (full, inner) => {
    const { raw, remote } = parseTarget(inner);
    const url = remote ? "" : urls.get(raw);
    if (!url) return full;
    const alt = /^!\[([^\]]*)\]/.exec(full)?.[1] ?? "";
    return `![${alt}](${url})`;
  });

  return {
    text: rewritten,
    total: resolved.length,
    uploaded: [...urls.values()],
    missing,
    moved,
    dry: false,
  };
}
