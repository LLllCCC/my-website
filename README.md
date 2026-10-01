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

## 自动部署配置

`.github/workflows/deploy.yml` 使用固定版本的 SSH Action 和专用部署账号。GitHub Actions
需要仓库变量 `SERVER_USER`、`DEPLOY_PATH`，以及密钥 `SERVER_IP`、`SERVER_SSH_KEY`。
服务器上的账号需要能更新该目录，并且只能通过 sudo 执行 `docker restart my-nginx`。
首次启用前需在服务器上创建并配置这个账号；工作流不会继续使用 root 密码。
