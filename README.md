# 🚀 Yopo's Personal Portal

> 基于 Apple Design 风格打造的个人便当盒主页。

---

## 🌟 项目亮点

-  **Apple Style UI**: 极简便当盒布局，磨砂玻璃导航栏。
- ⚡ **交互反馈**: 带有物理打击感的按钮与自定义 Toast 弹窗。
- 🕒 **实时动态**: JavaScript 驱动的实时时钟显示。
- 📱 **响应式设计**: 完美适配手机、平板与桌面端。

## 🛠️ 技术栈

![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23F7DF1E.svg?style=for-the-badge&logo=javascript&logoColor=black)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)

## 📸 预览地址

🔗 [yopoo.888431.xyz](https://yopoo.888431.xyz)

## Motion Web 案例

主页的 Motion Web 卡片会打开 `motion-web/cases/` 下的七个交互案例。案例来自
[feitangyuan/motion-web](https://github.com/feitangyuan/motion-web)，依照
[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) 标注来源，仅限非商业使用；详情见
`motion-web/ATTRIBUTION.md`。

## 资源版本号约定

静态站没有构建步骤，`?v=N` 是唯一的缓存失效手段：**所有本地 JS/CSS 引用统一用同一个版本号**（当前 `?v=28`）。改了任何 `.js`/`.css` 文件后，把五个 HTML 里的 `?v=` 和各模块 `import` 路径里的 `?v=` 一起 +1，否则浏览器可能继续用旧文件。

## 项目结构与本地预览

前端脚本是无构建的浏览器原生 ES Module：每个页面一个入口脚本（`main.js`/`blog.js`/`post.js`/`admin.js`），共享配置与工具在 `config.js`，评论区在 `comments.js`，评论渲染器在 `comment-markdown.js`，导航/页脚在 `nav.js`/`footer.js`。`theme-init.js` 是唯一的经典脚本（要在渲染前设置主题，防闪烁）。

样式在 `css/` 下按页面拆分（base/home/blog/post/admin/site 共 6 个文件），所有页面按固定顺序加载全部文件——顺序是级联的一部分，不要调换。

因为用了 ES Module，**本地预览不能直接双击 HTML**（浏览器会拦 `file://` 的模块请求），需要起一个本地静态服务，例如 `python -m http.server 8000` 后访问 `http://localhost:8000`。

## 自动部署配置

`.github/workflows/deploy.yml` 使用固定版本的 SSH Action 和专用部署账号。GitHub Actions
需要仓库变量 `SERVER_USER`、`DEPLOY_PATH`，以及密钥 `SERVER_IP`、`SERVER_SSH_KEY`。
服务器上的账号需要能更新该目录，并且只能通过 sudo 执行 `docker restart my-nginx`。
首次启用前需在服务器上创建并配置这个账号；工作流不会继续使用 root 密码。
