// 发布前本地图片转图床的测试：用假 PicList 服务端断言改写、失败与清理行为。
// 用法：node scripts/test-host-images.mjs
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hostLocalImages } from "./host-images.mjs";

let passed = 0;
let failed = 0;
function check(name, ok, detail = "") {
  if (ok) {
    passed++;
    console.log("  ✓ " + name);
  } else {
    failed++;
    console.log("  ✗ " + name + (detail ? "  ->  " + detail : ""));
  }
}

// 假 PicList：记录每次请求收到的文件，按脚本设定的规则回结果。
let requests = [];
let mode = "ok";
let concurrent = 0;
let maxConcurrent = 0;
const server = createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", async () => {
    concurrent++;
    maxConcurrent = Math.max(maxConcurrent, concurrent);
    requests.push(JSON.parse(body || "{}"));
    const reply =
      mode === "ok"
        ? {
            success: true,
            result: ["https://cdn.jsdelivr.net/gh/u/r@main/PicList/" + requests.length + ".jpg"],
          }
        : { success: false, message: "upload failed" };
    await new Promise((done) => setTimeout(done, 10));
    concurrent--;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(reply));
  });
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const endpoint = `http://127.0.0.1:${server.address().port}/upload?picbed=github&configName=tuchang`;

const workdir = await mkdtemp(join(process.env.TEMP || tmpdir(), "host-images-"));
await mkdir(join(workdir, "assets"), { recursive: true });
for (const name of ["a.jpg", "b.png", "带 空格.jpg"]) {
  await writeFile(join(workdir, "assets", name), "fake-image-bytes", "utf8");
}
const notePath = join(workdir, "文章.md");

const sample = [
  "---",
  "title: 测试文章",
  "---",
  "",
  "# 正文",
  "",
  "![](<assets/a.jpg>)",
  "",
  "![配图](assets/b.png)",
  "",
  "![空格图](assets/%E5%B8%A6%20%E7%A9%BA%E6%A0%BC.jpg)",
  "",
  "![网图](https://example.com/x.png)",
  "",
  "![](data:image/png;base64,AAAA)",
  "",
  "正文里提到 assets/a.jpg 但不算图片引用。",
  "",
].join("\n");
await writeFile(notePath, sample, "utf8");

// 1. 只认本地图片引用，远端与 base64 不碰
requests = [];
const dry = await hostLocalImages({ text: sample, notePath, endpoint, dryRun: true });
check("--dry 不发出任何上传请求", requests.length === 0, "发了 " + requests.length + " 次");
check(
  "--dry 认出 3 张本地图片",
  dry.total === 3 && dry.preview.length === 3,
  JSON.stringify(dry.preview)
);
check("--dry 不改写正文", dry.text === sample);

const notImage = await hostLocalImages({
  text: "普通链接 [点这里](assets/a.jpg) 不是图片",
  notePath,
  endpoint,
  dryRun: true,
});
check(
  "非图片语法的本地链接不动它",
  notImage.total === 0 && notImage.text === "普通链接 [点这里](assets/a.jpg) 不是图片",
  "total=" + notImage.total
);

// 2. 真上传：逐张串行，一次一张
requests = [];
mode = "ok";
maxConcurrent = 0;
const progress = [];
const uploaded = await hostLocalImages({
  text: sample,
  notePath,
  endpoint,
  onProgress: (line) => progress.push(line),
});
check("每张本地图片各发一次请求", requests.length === 3, "次数=" + requests.length);
check(
  "并发不超过 1（PicList 切图床配置不能并行）",
  maxConcurrent === 1,
  "最大并发=" + maxConcurrent
);
check(
  "每次请求只带一个绝对路径",
  requests.every((r) => Array.isArray(r.list) && r.list.length === 1 && existsSync(r.list[0])),
  JSON.stringify(requests)
);
check(
  "URL 编码的空格文件名解析成功",
  requests.some((r) => r.list[0].endsWith("带 空格.jpg")),
  JSON.stringify(requests.map((r) => r.list[0]))
);
check(
  "三张全部回报成功",
  uploaded.uploaded.length === 3 && uploaded.missing.length === 0,
  JSON.stringify(uploaded.missing)
);
check("改写后正文里不再有本地路径", !/!\[[^\]]*\]\(\s*<?assets/.test(uploaded.text), uploaded.text);
check(
  "尖括号引用换成图床链接且尖括号去掉",
  uploaded.text.includes("\n![](https://cdn.jsdelivr.net/gh/u/r@main/PicList/1.jpg)\n"),
  JSON.stringify(uploaded.text.split("\n")[6])
);
check(
  "alt 文本保留",
  uploaded.text.includes("![配图](https://cdn.jsdelivr.net"),
  uploaded.text.split("\n")[8]
);
check("远端图片原样不动", uploaded.text.includes("![网图](https://example.com/x.png)"));
check("base64 图片原样不动", uploaded.text.includes("![](data:image/png;base64,AAAA)"));
check(
  "正文里非引用的 assets/a.jpg 文字没被误伤",
  uploaded.text.includes("正文里提到 assets/a.jpg")
);
check("进度每张一行", progress.length === 3, progress.join(" | "));

// 3. 上传失败必须报出来，publish 才不会把死链发出去
requests = [];
mode = "fail";
const broken = await hostLocalImages({ text: sample, notePath, endpoint });
check("失败时三张都进 missing", broken.missing.length === 3, JSON.stringify(broken.missing));
check("失败原因带上服务端返回", broken.missing[0].includes("success"), broken.missing[0]);
check("失败时正文保持原样（不发半成品）", broken.text === sample);
check("失败时本地图还在原位", existsSync(join(workdir, "assets", "a.jpg")));

// 4. 传完清理：只挪上传成功的那几张，进 .trash
requests = [];
mode = "ok";
const trashDir = join(workdir, ".trash");
const dropped = await hostLocalImages({
  text: sample,
  notePath,
  endpoint,
  dropAfterUpload: true,
  trashDir,
});
check(
  "三张本地图被挪进 .trash",
  dropped.moved.length === 3 && existsSync(trashDir),
  JSON.stringify(dropped.moved)
);
check("原位置不再留文件", !existsSync(join(workdir, "assets", "a.jpg")));
check("图还在 .trash 里没被删掉", existsSync(join(trashDir, "a.jpg")));
check("挪完仍能改写成功", dropped.text.includes("https://cdn.jsdelivr.net"));

mode = "ok";
requests = [];
const none = await hostLocalImages({
  text: "# 全是远端\n![x](https://a.com/1.png)\n",
  notePath,
  endpoint,
});
check(
  "没有本地图时一次请求都不发",
  none.total === 0 && requests.length === 0,
  "total=" + none.total
);

console.log(failed ? "\n失败 " + failed + " 项" : "\n全部 " + passed + " 项通过");
server.close();
process.exit(failed ? 1 : 0);
