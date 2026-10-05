# AGENTS.md — my-website（Yopo 个人主页 + 博客前端）

给在本仓库工作的 AI 编码助手看的约定。改代码前先读完这份文件；与 README 冲突时以本文为准。

## 这个仓库是什么

静态站，**无构建、无框架**：5 个 HTML 页面 + 浏览器原生 ES Module 脚本 + `css/` 下按页面拆分的样式。
push 到 `main` 即自动部署上线（Actions SSH 到服务器 `git pull` + 重启 nginx），**每个提交都直接面向线上**。

## 文件地图

| 文件 | 职责 |
|---|---|
| `index.html` + `main.js` | 首页：邮件卡片、视差、最新文章卡片 |
| `blog.html` + `blog.js` | 博客列表：搜索、标签云、文章卡片 |
| `post.html` + `post.js` | 文章页：Markdown 渲染、目录、封面定位、阅读进度 |
| `comments.js` | 评论区：昵称生成、表情回应、排序、两层楼中楼。**评论相关改动只进这个文件** |
| `comment-markdown.js` | 评论正文的 Markdown 子集渲染器（配套 15 项测试） |
| `admin.html` + `admin.js` | 后台：文章管理 + 评论审核 |
| `site.html` | 「这个网站是怎么搭的」说明页 |
| `nav.js` / `footer.js` | 全站导航与页脚（各页面注入） |
| `config.js` | 共享配置与工具：`CONFIG`、`showToast`、`debounce`、`formatDateTime`、`safeHttpUrl` |
| `theme-init.js` | **唯一的经典脚本**，在 `<head>` 阻塞执行防主题闪烁；不要改成 module |
| `css/` | 全站样式，按页面拆分：`base.css`（主题变量/布局/导航/页脚/Toast/回到顶部）+ `home.css` / `blog.css` / `post.css` / `admin.css` / `site.css`。**所有 HTML 按这个顺序加载全部 6 个文件**，顺序是级联的一部分，不要调换 |
| `scripts/publish.mjs` | Obsidian 笔记发布脚本（配合 myblog-api 的 `/api/posts`） |
| `scripts/test-comment-markdown.mjs` | 评论渲染器测试 |
| `motion-web/` | 外部 CC BY-NC 动效案例素材，**不要改其中的代码** |

## 改代码的规则

1. 新功能进对应页面的入口脚本；跨页面复用的函数放 `config.js` 并 `export`。
2. 任何 `.js`/`.css` 改动后：五个 HTML 里的 `?v=` **和**各模块 `import` 路径里的 `?v=` 一起 +1（当前 `27`），否则浏览器继续用旧缓存。没有构建步骤，版本号是唯一缓存失效手段。
3. 提交前必跑：`npm run lint` 和 `npm test`；改了 JS 顺带 `npm run format`。CI 会再查一遍，不过不部署。
4. 不引入打包器、框架、运行时依赖；保持无构建。
5. `css/` 只做最小改动：改对应页面的文件；`base.css` 是全站的，动之前先想其他页面。别重排格式，别为对齐更换布局模型。
6. 渲染用户内容只能用 `createElement`/`createTextNode`，**禁止对用户输入用 `innerHTML`**（文章正文例外：必须过 `DOMPurify.sanitize`）。
7. 图片/链接 URL 一律走 `config.js` 的 `safeHttpUrl`（只放行 http/https）。
8. 本地预览要起静态服务（如 `python -m http.server`），ES Module 不能 `file://` 双击打开。
9. 提交信息用 conventional commits 中文风格：`feat:` / `fix:` / `chore:` / `refactor:` / `design:`。

## 部署红线

- **push = 上线**。不 force push，不在服务器上手动改文件（历史上有过 XFTP 手改弄坏部署的事故）。
- 令牌类秘密只存在于 `myblog-api/.env`，绝不进本仓库、笔记或聊天。
