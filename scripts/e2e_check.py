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

        # 滚动入场（theme-init.js 打标记 + reveal.js 观察视口）。
        # 断言的是不变量，不是"立刻全都可见"——下折叠下方的元素本来就该等到滚进视口再入场。
        check("首页 滚动入场已启用", page.evaluate("() => document.documentElement.classList.contains('has-reveal')"))
        # 首屏元素有 70ms 递增的错峰 + 520ms 动画，等它播完再判断
        page.wait_for_timeout(1200)
        in_view_hidden = page.evaluate(
            "() => [...document.querySelectorAll('.fade-in')].filter(el => {"
            " const r = el.getBoundingClientRect();"
            " return r.top < window.innerHeight && r.bottom > 0 && getComputedStyle(el).opacity === '0'; }).length"
        )
        check("首页 视口内的入场元素已显示", in_view_hidden == 0, in_view_hidden)
        # 真正要防的是"元素被永久留在隐藏状态"：分步滚过整页，一个都不该剩下
        page.evaluate(
            """async () => {
                 const step = Math.round(window.innerHeight * 0.8);
                 for (let y = 0; y <= document.documentElement.scrollHeight; y += step) {
                   window.scrollTo(0, y);
                   await new Promise(r => setTimeout(r, 90));
                 }
               }"""
        )
        page.wait_for_timeout(600)
        stuck = page.evaluate(
            "() => [...document.querySelectorAll('.fade-in')].filter(el => getComputedStyle(el).opacity === '0').length"
        )
        check("首页 滚过整页后无残留隐藏", stuck == 0, stuck)
        page.evaluate("window.scrollTo(0, 0)")
        page.wait_for_timeout(200)
        # Hero 指针交互：真实移动指针，CSS 变量必须变化
        hero_box = page.locator("#home").bounding_box()
        page.mouse.move(hero_box["x"] + hero_box["width"] * 0.25, hero_box["y"] + hero_box["height"] * 0.3)
        page.wait_for_timeout(150)
        hero_x = page.evaluate("() => document.getElementById('home').style.getPropertyValue('--hero-x')")
        check("首页 hero 指针交互生效（--hero-x）", hero_x != "", hero_x)
        # 卡片是 <a>，不显式关掉下划线就会在文字下面画出一条多余的分隔线
        check(
            "首页 卡片链接无默认下划线",
            page.evaluate("() => getComputedStyle(document.getElementById('my-projects')).textDecorationLine") == "none",
            page.evaluate("() => getComputedStyle(document.getElementById('my-projects')).textDecorationLine"),
        )

        page.goto(BASE + "/blog.html", wait_until="networkidle")
        check("博客 文章卡片 3 张", page.locator(".blog-post-card").count() == 3)
        check("博客 标签云有按钮", page.locator(".tag-btn").count() >= 2)
        # 全文搜索：关键词长度达到阈值后应请求 /api/posts/search 并把正文命中并进结果。
        page.fill("#blog-search", "第二篇")
        page.wait_for_timeout(700)
        check("博客 全文搜索命中标题", page.locator(".blog-post-card").count() == 1, page.locator(".blog-post-card").count())
        check(
            "博客 搜索结果显示摘要或片段",
            "二" in page.locator(".blog-post-card .blog-post-excerpt").first.inner_text(),
            page.locator(".blog-post-card .blog-post-excerpt").first.inner_text(),
        )
        page.fill("#blog-search", "绝对搜不到的词xyzzy")
        page.wait_for_timeout(700)
        check("博客 无结果时给出空状态", page.locator(".blog-empty-state").count() == 1)
        page.fill("#blog-search", "")
        page.wait_for_timeout(700)
        check("博客 清空搜索后恢复全部文章", page.locator(".blog-post-card").count() == 3)

        # 键盘快捷键（keys.js）。重点是那条铁律：在输入框里打字时单键快捷键必须让路。
        page.locator("#blog-search").blur()
        page.keyboard.press("/")
        page.wait_for_timeout(150)
        check(
            "快捷键 / 聚焦搜索框",
            page.evaluate("() => document.activeElement && document.activeElement.id") == "blog-search",
            page.evaluate("() => document.activeElement && document.activeElement.id"),
        )
        theme_before = page.evaluate("() => document.documentElement.getAttribute('data-theme')")
        page.keyboard.type("ttt", delay=20)
        page.wait_for_timeout(200)
        check(
            "快捷键 输入框内打字不触发（主题未变）",
            page.evaluate("() => document.documentElement.getAttribute('data-theme')") == theme_before
            and page.evaluate("() => document.getElementById('blog-search').value") == "ttt",
            theme_before,
        )
        page.evaluate("() => { const s = document.getElementById('blog-search'); s.value = ''; s.blur(); }")
        page.keyboard.press("t")
        page.wait_for_timeout(150)
        check(
            "快捷键 t 切换主题",
            page.evaluate("() => document.documentElement.getAttribute('data-theme')") != theme_before,
        )
        page.keyboard.press("t")  # 切回来，别影响后面的截图
        page.wait_for_timeout(150)
        if shot_dir:
            page.screenshot(path=os.path.join(shot_dir, "blog.png"), full_page=True)

        page.goto(BASE + "/archive.html", wait_until="networkidle")
        check("归档 导航已注入", page.locator(".nav-container").count() == 1)
        check("归档 标题为归档", "归档" in page.locator(".blog-hero h1").inner_text())
        check("归档 按月份分组", page.locator(".archive-group").count() == 1, page.locator(".archive-group").count())
        check("归档 每组有文章条目", page.locator(".archive-item").count() == 3)
        # 桩数据里三篇都在 2026-10，所以年份筛选只有「全部 + 2026」两个按钮。
        check("归档 年份筛选按钮（含全部）", page.locator(".archive-year-btn").count() == 2, page.locator(".archive-year-btn").count())
        check("归档 总数已填充", page.locator("#archive-total-count").inner_text() == "03", page.locator("#archive-total-count").inner_text())
        check("归档 文章链接指向文章页", "post.html?id=" in (page.locator(".archive-item-link").first.get_attribute("href") or ""))
        page.locator(".archive-year-btn").nth(1).click()
        page.wait_for_timeout(200)
        check("归档 点年份后只剩该年", page.locator(".archive-item").count() == 3)
        page.fill("#archive-search", "第三篇")
        page.wait_for_timeout(400)
        check("归档 搜索生效", page.locator(".archive-item").count() == 1)
        page.fill("#archive-search", "")
        page.wait_for_timeout(300)
        if shot_dir:
            page.screenshot(path=os.path.join(shot_dir, "archive.png"), full_page=True)

        page.goto(BASE + "/post.html?id=1", wait_until="networkidle")
        check("文章 标题", page.locator("#article-title").inner_text() == "ESM 验证文章")
        check("文章 正文渲染出 h2", page.locator("#article-body h2").count() == 2)
        check("文章 目录生成", page.locator("#article-toc li").count() == 2)
        # 空目录必须完全不渲染：加载期它已经是个带背景和边框的框了，
        # 不隐藏就会在正文左侧闪出一个空方块。
        empty_display = page.evaluate(
            "() => { const t = document.querySelector('#article-toc'); const keep = t.innerHTML;"
            " t.innerHTML = ''; const d = getComputedStyle(t).display; t.innerHTML = keep; return d; }"
        )
        check("文章 空目录不渲染", empty_display == "none", empty_display)
        # 目录必须完整落在视口内。以前沟槽版规则写在文件末尾且不带媒体查询，
        # 盖掉了所有窄屏规则：1280 下左边缘是 -48，手机上更是完全看不见。
        # 只断言"目录有几项"是抓不到这种错的——必须查几何。
        vw = page.viewport_size["width"]
        toc_box = page.locator("#article-toc").bounding_box()
        check(
            "文章 目录完整落在视口内（宽屏）",
            toc_box and toc_box["x"] >= 0 and toc_box["x"] + toc_box["width"] <= vw,
            toc_box,
        )
        page.set_viewport_size({"width": 375, "height": 800})
        page.wait_for_timeout(300)
        toc_narrow = page.locator("#article-toc").bounding_box()
        main_narrow = page.locator(".article-main").bounding_box()
        check(
            "文章 目录完整落在视口内（窄屏 375px）",
            toc_narrow and toc_narrow["x"] >= 0 and toc_narrow["x"] + toc_narrow["width"] <= 375,
            toc_narrow,
        )
        check(
            "文章 窄屏下目录不与正文重叠",
            toc_narrow and main_narrow and toc_narrow["y"] + toc_narrow["height"] <= main_narrow["y"] + 1,
            f"toc bottom={toc_narrow['y'] + toc_narrow['height'] if toc_narrow else '?'} main top={main_narrow['y'] if main_narrow else '?'}",
        )
        page.set_viewport_size({"width": 1280, "height": 800})
        page.wait_for_timeout(250)
        # 目录随滚动高亮：滚到底部时恰好一项处于激活态（末尾几节靠"到底强制选中"兜底）
        page.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)")
        page.wait_for_timeout(300)
        check(
            "文章 目录随滚动高亮（恰好一项）",
            page.locator("#article-toc .article-toc-item a.is-active").count() == 1,
            page.locator("#article-toc .article-toc-item a.is-active").count(),
        )
        # 正文滚动渐入：不变量是"没有任何元素被永久留在隐藏状态"。
        # 注意短文章可能整篇都在首屏内，那种情况下本来就不该有元素被打上类。
        stuck = page.evaluate(
            "() => [...document.querySelectorAll('.content-reveal')]"
            ".filter(el => !el.classList.contains('is-revealed')).length"
        )
        check("文章 正文渐入无残留隐藏", stuck == 0, stuck)
        page.evaluate("window.scrollTo(0, 0)")
        page.wait_for_timeout(200)
        check("文章 上一篇/下一篇只显示下一篇", page.locator("#article-neighbors .article-neighbor").count() == 1)
        # 文章1 标签「代码,生活」：文章2「代码」与文章3「生活」各命中一个共同标签，
        # 因此两篇都应被推荐（只要求有结果且不把自己算进去）。
        check("文章 相关阅读显示同标签文章", page.locator("#article-related .article-related-item").count() == 2, page.locator("#article-related .article-related-item").count())
        related_titles = page.locator("#article-related .article-related-link").all_inner_texts()
        check(
            "文章 相关阅读不含自己",
            "ESM 验证文章" not in related_titles,
            related_titles,
        )
        check(
            "文章 相关阅读标出共同标签",
            page.locator("#article-related .article-related-tag").count() >= 1,
            page.locator("#article-related .article-related-tag").count(),
        )
        related_hrefs = [
            link.get_attribute("href") or "" for link in page.locator("#article-related .article-related-link").all()
        ]
        # 两篇各命中一个共同标签、shared 相等时按日期倒序，所以顺序不固定，只校验集合。
        check(
            "文章 相关阅读链接指向同标签的两篇",
            sorted(related_hrefs) == ["post.html?id=2", "post.html?id=3"],
            related_hrefs,
        )
        check("文章 表情回应栏 4 个按钮", page.locator("#article-reactions .article-reaction").count() == 4)
        check("文章 代码块有复制按钮", page.locator("#article-body .code-copy-btn").count() == 2)
        # 行号由伪元素渲染：数字不进 code.textContent，所以复制内容必须是纯代码。
        line_info = page.evaluate(
            """() => {
              const pre = document.querySelector('#article-body pre');
              if (!pre) return null;
              return {
                cls: pre.classList.contains('has-line-numbers'),
                lines: pre.dataset.lines || '',
                gutter: getComputedStyle(pre, '::before').content || '',
                code: (pre.querySelector('code') || {}).textContent || '',
                gutFont: getComputedStyle(pre, '::before').fontSize,
                preFont: getComputedStyle(pre).fontSize,
                wrapped: pre.classList.contains('is-wrapped'),
              };
            }"""
        )
        check("文章 多行代码块有行号", bool(line_info) and line_info["cls"], line_info and line_info["lines"])
        check(
            "文章 行号逐行渲染且行数正确",
            bool(line_info) and line_info["lines"] == "1\n2\n3",
            line_info and repr(line_info["lines"]),
        )
        check(
            "文章 行号字号与代码一致（否则对不齐）",
            bool(line_info) and line_info["gutter"] and line_info["gutFont"] == line_info["preFont"],
            line_info and f"{line_info['gutFont']} / {line_info['preFont']}",
        )
        check(
            "文章 复制内容不含行号",
            bool(line_info) and "\n1\n" not in line_info["code"] and line_info["code"].startswith("npm install"),
            line_info and repr(line_info["code"][:30]),
        )
        # 放得下的块保持不换行——行号只在"整块能放下"时才有意义。
        check(
            "文章 短行代码块不换行（行号才留得住）",
            bool(line_info) and not line_info["wrapped"],
            line_info and f"wrapped={line_info['wrapped']}",
        )
        # 放不下的块换成软换行，同时撤掉行号（换行后行号会和视觉行错位）。
        # 注意溢出量要在 <code> 上量：hljs 给 .hljs 带了 overflow-x:auto，
        # 真正会横向滚动的是 code 那一层，pre 的 scrollWidth 恒等于 clientWidth。
        wrap_info = page.evaluate(
            """() => {
              const pres = [...document.querySelectorAll('#article-body pre')];
              const pre = pres[1];
              if (!pre) return null;
              const code = pre.querySelector('code');
              return {
                wrapped: pre.classList.contains('is-wrapped'),
                overflow: code ? code.scrollWidth - code.clientWidth : 0,
                whiteSpace: code ? getComputedStyle(code).whiteSpace : '',
                gutter: getComputedStyle(pre, '::before').content || 'none',
                padLeft: Math.round(parseFloat(getComputedStyle(pre).paddingLeft)),
              };
            }"""
        )
        check("文章 超长行代码块自动软换行", bool(wrap_info) and wrap_info["wrapped"], wrap_info)
        check(
            "文章 换行块没有横向溢出（等于没有滚动条）",
            bool(wrap_info) and wrap_info["overflow"] <= 1,
            wrap_info and wrap_info["overflow"],
        )
        check(
            "文章 换行块不渲染行号（否则会指错行）",
            bool(wrap_info) and wrap_info["gutter"] in ("none", "normal"),
            wrap_info and wrap_info["gutter"],
        )
        check(
            "文章 换行块的左内边距已还原（不留给行号的空位）",
            bool(wrap_info) and wrap_info["padLeft"] <= 30,
            wrap_info and wrap_info["padLeft"],
        )
        check("评论 两条留言", page.locator("#comment-list .comment-item").count() == 2)
        check("评论 Markdown 粗体渲染", page.locator(".comment-md-strong").count() >= 1)
        check("评论 楼中楼回复标记", page.locator(".comment-item--reply").count() == 1)
        check("评论 排序按钮 3 个", page.locator(".comment-sort-btn").count() == 3)
        page.locator("#article-reactions .article-reaction").first.click()
        page.wait_for_timeout(600)
        check("文章 表情点击后计数刷新", "3" in page.locator("#article-reactions .article-reaction").first.inner_text())
        page.locator("#article-body img").first.click()
        page.wait_for_timeout(300)
        check("文章 灯箱打开", page.locator(".lightbox-overlay").count() == 1)
        page.locator(".lightbox-overlay").click()
        page.wait_for_timeout(200)
        check("文章 灯箱点击关闭", page.locator(".lightbox-overlay").count() == 0)
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
