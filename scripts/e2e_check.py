"""浏览器端到端检查：假接口 + 静态站，验证五个页面的模块加载与核心交互。
本地跑法：python scripts/e2e_check.py（需要 pip install playwright && playwright install chromium）
"""
import os
import subprocess
import sys
import tempfile
import time
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

BASE = None  # 由子进程分配的随机端口决定
failures = []


def check(name, ok, detail=""):
    print(("  ok   " if ok else "  FAIL ") + name + ("" if ok else " -> " + str(detail)[:120]))
    if not ok:
        failures.append(name)


def main():
    global BASE
    server = subprocess.Popen(
        [sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "e2e_stub_server.py")],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
        encoding="utf-8",
    )
    try:
        # 子进程会先打印 PORT=nnnn 再开始服务，用它避免端口冲突。
        line = server.stdout.readline()
        assert line.startswith("PORT="), "stub 服务没有正常启动: " + line
        BASE = "http://127.0.0.1:" + line.strip().split("=", 1)[1]
        for _ in range(50):
            try:
                urllib.request.urlopen(BASE + "/api/posts", timeout=2)
                break
            except Exception:
                time.sleep(0.2)
        run_checks()
    finally:
        server.terminate()

    print()
    print("失败项: " + str(len(failures)))
    sys.exit(1 if failures else 0)


def run_checks():
    from playwright.sync_api import sync_playwright

    shot_dir = os.environ.get("E2E_SCREENSHOT_DIR")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        console_errors = []
        page.on(
            "console",
            lambda msg: console_errors.append(f"{msg.type}:{msg.text}") if msg.type == "error" else None,
        )
        page.on("pageerror", lambda err: console_errors.append("pageerror:" + str(err)))

        page.goto(BASE + "/index.html", wait_until="networkidle")
        check("首页 导航已注入", page.locator(".nav-container").count() == 1)
        check("首页 页脚已注入", page.locator(".site-footer").count() == 1)
        check("首页 最新文章卡片显示最新一篇", page.locator("#home-blog-title").inner_text() == "第三篇文章", page.locator("#home-blog-title").inner_text())
        if shot_dir:
            page.screenshot(path=os.path.join(shot_dir, "index.png"), full_page=True)

        page.goto(BASE + "/blog.html", wait_until="networkidle")
        check("博客 文章卡片 3 张", page.locator(".blog-post-card").count() == 3)
        check("博客 标签云有按钮", page.locator(".tag-btn").count() >= 2)
        if shot_dir:
            page.screenshot(path=os.path.join(shot_dir, "blog.png"), full_page=True)

        page.goto(BASE + "/post.html?id=1", wait_until="networkidle")
        check("文章 标题", page.locator("#article-title").inner_text() == "ESM 验证文章")
        check("文章 正文渲染出 h2", page.locator("#article-body h2").count() == 2)
        check("文章 目录生成", page.locator("#article-toc li").count() == 2)
        check("评论 两条留言", page.locator("#comment-list .comment-item").count() == 2)
        check("评论 Markdown 粗体渲染", page.locator(".comment-md-strong").count() >= 1)
        check("评论 楼中楼回复标记", page.locator(".comment-item--reply").count() == 1)
        check("评论 排序按钮 3 个", page.locator(".comment-sort-btn").count() == 3)
        page.locator(".comment-reaction").first.click()
        page.wait_for_timeout(600)
        check("评论 表情点击后计数刷新", "2" in page.locator(".comment-reaction").first.inner_text())
        if shot_dir:
            page.screenshot(path=os.path.join(shot_dir, "post.png"), full_page=True)

        page.goto(BASE + "/admin.html", wait_until="networkidle")
        check("后台 登录区可见", page.locator("#admin-auth").is_visible())
        check("后台 工作台隐藏", page.locator("#admin-workspace").is_hidden())

        page.goto(BASE + "/site.html", wait_until="networkidle")
        check("site 导航已注入", page.locator(".nav-container").count() == 1)
        if shot_dir:
            page.screenshot(path=os.path.join(shot_dir, "site.png"), full_page=True)

        check("控制台无错误", not console_errors, console_errors)
        browser.close()


if __name__ == "__main__":
    main()
