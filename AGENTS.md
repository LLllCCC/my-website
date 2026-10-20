# AGENTS.md — my-website（Yopo 个人主页 + 博客前端）

给在本仓库工作的 AI 编码助手看的约定。改代码前先读完这份文件；与 README 冲突时以本文为准。

## 这个仓库是什么

静态站，**无构建、无框架**：5 个 HTML 页面 + 浏览器原生 ES Module 脚本 + `css/` 下按页面拆分的样式。
push 到 `main` 即自动部署上线（Actions SSH 到服务器 `git pull` + 重启 nginx），**每个提交都直接面向线上**。

## 文件地图

| 文件 | 职责 |
|---|---|
| `index.html` + `main.js` | 首页：邮件卡片、视差、最新文章卡片 |
| `blog.html` + `blog.js` | 博客列表：搜索（本地 + 后端全文两级）、标签云、文章卡片 |
| `archive.html` + `archive.js` | 归档：年份切换 + 按月分组，纯前端用列表接口数据 |
| `tag.html` + `tag.js` | 标签：标签云 + 按 `?t=xxx` 筛选。每个标签有独立可分享链接（`?t=` 会 pushState 进 URL，支持前进后退） |
| `stats.html` + `stats.js` | 写作统计：概览四卡、近一年热力图、标签分布、按年汇总。字数 = 正文去代码块后的非空白字符数，逐篇拉详情得出。`?until=YYYY-MM-DD` 可固定热力图窗口（e2e 靠它让断言不依赖真实日期） |
| `guestbook.html` + `guestbook.js` | 留言板：提交 + 列表。复用 comments.js 的昵称记忆与 post.css 的评论样式类。**先审后发**，审核在后端 admin（留言走 `/api/admin/guestbook`）；蜜罐与限流由后端承担 |
| `gallery.html` + `gallery.js` | 壁纸：缩略图网格 + 点开看原图的灯箱。**依赖生成的 `gallery.data.js`**，见下方「壁纸约定」 |
| `gallery.data.js` | **由 `scripts/build-gallery.py` 生成，不要手改**。相册清单（文件名 / 缩略图路径 / 尺寸） |
| `scripts/build-gallery.py` | 相册构建：按图床目录列出图片 → 下载原图 → 生成 `img/wallpaper/` 下 480px 缩略图 → 写 `gallery.data.js`。需要 Pillow |
| `post.html` + `post.js` | 文章页：Markdown 渲染、目录、封面定位、阅读进度、系列导航、相关阅读 |
| `series.js` | **系列/合集的定义与标签工具**：`SERIES_TAGS` 声明哪些标签代表一个系列，成员 = 带该标签的文章。**新增系列只能改这里**（见下方「系列约定」） |
| `postList.js` | 归档页与标签页共用的「一行一篇」渲染（`dateKeyOf` / `matchesKeyword` / `buildPostRow`），改一处两边都变 |
| `comments.js` | 评论区：昵称生成、表情回应、排序、两层楼中楼。**评论相关改动只进这个文件** |
| `comment-markdown.js` | 评论正文的 Markdown 子集渲染器（配套 15 项测试） |
| `admin.html` + `admin.js` | 后台：文章管理 + 评论审核 |
| `site.html` | 「这个网站是怎么搭的」说明页 |
| `nav.js` / `footer.js` | 全站导航与页脚（各页面注入；新增页面时两处都要加链接） |
| `config.js` | 共享配置与工具：`CONFIG`、`showToast`、`debounce`、`formatDateTime`、`safeHttpUrl` |
| `sitemap.xml` | **由 `scripts/publish.mjs` 每次发布全量重写**，手改会被冲掉；要加静态页（如 `archive.html`）必须改 `buildSitemap()` |
| `theme-init.js` | **唯一的经典脚本**，在 `<head>` 阻塞执行防主题闪烁；不要改成 module |
| `css/` | 全站样式，按页面拆分：`base.css`（主题变量/布局/导航/页脚/Toast/回到顶部）+ `home.css` / `blog.css` / `post.css` / `admin.css` / `site.css`。**所有 HTML 按这个顺序加载全部 6 个文件**，顺序是级联的一部分，不要调换 |
| `scripts/publish.mjs` | Obsidian 笔记发布脚本（配合 myblog-api 的 `/api/posts`）；笔记 YAML 认 `title`/`tags`/`cover`/`description`/`date`/`post-id` 六个键 |
| `scripts/test-comment-markdown.mjs` | 评论渲染器测试 |
| `scripts/e2e_check.py` + `e2e_stub_server.py` | 浏览器端到端检查（假接口 + Playwright，随机端口）；CI 会跑，本地 `python scripts/e2e_check.py` |
| `motion-web/` | 外部 CC BY-NC 动效案例素材，**不要改其中的代码** |
| `templates/` | 模板实验室：`templates/index.html` 是展厅（分类筛选 + 截图预览，点 LIVE 才创建 iframe）。每个子目录一个**单文件**模板页，24 个页面均按 Qoder 缓存里的原始示例截图重做。模板不引用站内 CSS/JS，加新模板时同步更新展厅 `CASES`、`publish.mjs` 的 sitemap 列表和 favicon 链接。24 张预览图在 `img/templates/preview/`，从对应页面 hero（1440×900）截取；首页「模板实验室」卡复用其中四张 |

## 壁纸约定（加壁纸时必须走这条流程）

壁纸原图存在**图床仓库 `LLllCCC/tuchaung` 的 `Wallpaper/` 目录**（不是本站仓库）。

**为什么不能在页面里直接显示原图**：那批原图 30 张共 **75 MB**，平均 2.5 MB、单张最大 18 MB。直接铺在页面上，手机滚一遍就是几十兆。所以列表里只放**缩略图**（480px 宽、JPEG q78，约 45 KB/张，整页 1 MB 出头），原图只在点开灯箱时才加载。

**加壁纸的流程**：

1. 把原图传到图床仓库的 `Wallpaper/`（PicList 或 GitHub 网页都行）
2. 在站点仓库跑 `python scripts/build-gallery.py`（需要 Pillow）——它会列出远端目录、下载原图、生成 `img/wallpaper/` 下的缩略图、并重写 `gallery.data.js`
3. 把新的缩略图和 `gallery.data.js` 一起提交

脚本会**跳过已有缩略图**，所以中断后重跑是断点续传，不会重复下载。下载会按 Content-Length 校验字节数并重试——这条跨境线路会截断响应，不校验就会拿到半个文件。

**两条不要踩的线**：

- 页面**不能**在运行时去调 GitHub API 列目录：跨境慢，且未鉴权**限流 60 次/小时**。清单必须是构建时生成的。
- 灯箱里的原图 URL 用 `jsDelivr`（`gallery.data.js` 里的 `GALLERY_CDN`）。实测 **18 MB 那张 jsDelivr 也能完整返回**，而 `raw.githubusercontent.com` 在本机直连常失败。

## 代码块约定（改 post.js 的代码块部分前必读）

`post.js` 的 `renderCodeLines()` 把每个代码块重排成 **每行一个 grid 行**：

```html
<span class="code-line">
  <span class="code-line-no">1</span>
  <span class="code-line-text">……</span>
</span>
```

**别再改回"整列数字塞进一个伪元素"的写法。** 那种做法隐含假设「一个逻辑行 = 一个视觉行」，某行一旦折行，后面的数字就全部错位——以前只能二选一：要么有行号但长行要拖横向滚动条，要么软换行但撤掉行号。grid 方案让两件事同时成立（代码折行只撑高自己那一格，行号仍停在该行第一行位置），而且对齐是布局算出来的，**不需要任何 resize 重算**。

**切行必须走 DOM，不能切 HTML 字符串。** highlight.js 的标签会跨行（多行字符串就是**一个** `<span>`），按 `\n` 切 HTML 会把标签切坏。`codeLinesOf()` 递归遍历文本节点，遇到 `\n` 就另起一行，并把当时的**祖先链 clone 出来**包住该行文本，跨行的 span 于是每行各有一份副本。测试桩里第三个代码块（`const s = \`alpha\nbeta\`;`）就是专门守这条路径的。

**复制按钮必须走 `codeTextOf(pre)`，不能读 `code.textContent`。** 行号现在是真实元素，`textContent` 一定带上数字。e2e 里有一条**真点复制按钮读剪贴板**的断言盯着这件事（Windows 会把 `\n` 规范成 `\r\n`，比较前先归一化）。

## 系列约定（写文章时必须知道）

「系列/合集」**不给 `posts` 表加列**，而是用标签表达——理由见知识库「为什么默认不动表」。

- **系列的定义只在 `series.js` 的 `SERIES_TAGS` 里**。数组里出现某个标签名，就意味着「带该标签的文章构成一个系列」。
- **新增一个系列 = 两步**：① 在 `SERIES_TAGS` 里加标签名；② 用 `publish.mjs` 给相关笔记打上这个同名的标签。成员不另维护 id 清单——清单一定会和文章漂移。
- 当前系列：`自建服务`。
- 文章页的系列导航**按日期升序**排（最早的算第 1 篇），`SERIES_MAX` 上限 12 条，超出的只去 `tag.html` 看全量。
- 一个标签同时命中多个系列时取第一个；只有 1 篇成员的"系列"不显示导航（一篇不构成系列）。

## 改代码的规则

1. 新功能进对应页面的入口脚本；跨页面复用的函数放 `config.js` 并 `export`。
2. 任何 `.js`/`.css` 改动后：所有 HTML 里的 `?v=` **和**各模块 `import` 路径里的 `?v=` 一起 +1（当前 `58`），否则浏览器继续用旧缓存。没有构建步骤，版本号是唯一缓存失效手段。
   **必须做全库替换并把残留数检查到 0**：只改自己知道的那几个文件会漏（2026-10-10 就漏过 91 处，见下）。
   ```bash
   grep -rlE '\?v=NN' --include=*.html --include=*.js . | grep -v node_modules | grep -v 'motion-web/cases' \
     | xargs sed -i 's/?v=NN/?v=MM/g'
   grep -rEo '\?v=[0-9]+' --include=*.html --include=*.js . | grep -v node_modules | sort -u   # 必须只剩一个版本
   ```
3. 提交前必跑**三项**：`npm run lint`、`npm run format:check`、`npm test`。**少跑 `format:check` 已经被 CI 拦过一次、部署直接失败**（2026-10-10）。CI 还会跑浏览器端到端（参考，不拦部署）。
   注意在 Windows 上直接跑 prettier 会因 CRLF 得到**假结果**（一次报十几个文件），那唯一真问题会被淹没；要精确复现 CI 得先做 LF 干净检出，做法见知识库项目笔记。
4. 不引入打包器、框架、运行时依赖；保持无构建。
5. `css/` 只做最小改动：改对应页面的文件；`base.css` 是全站的，动之前先想其他页面。别重排格式，别为对齐更换布局模型。
6. 渲染用户内容只能用 `createElement`/`createTextNode`，**禁止对用户输入用 `innerHTML`**（文章正文例外：必须过 `DOMPurify.sanitize`）。
7. 图片/链接 URL 一律走 `config.js` 的 `safeHttpUrl`（只放行 http/https）。
8. 本地预览要起静态服务（如 `python -m http.server`），ES Module 不能 `file://` 双击打开。
9. 提交信息用 conventional commits 中文风格：`feat:` / `fix:` / `chore:` / `refactor:` / `design:`。

## 部署红线

- **push = 上线**。不 force push，不在服务器上手动改文件（历史上有过 XFTP 手改弄坏部署的事故）。
- 令牌类秘密只存在于 `myblog-api/.env`，绝不进本仓库、笔记或聊天。
