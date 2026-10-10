"""浏览器端到端检查：假接口 + 静态站，验证五个页面的模块加载与核心交互。
本地跑法：python scripts/e2e_check.py（需要 pip install playwright && playwright install chromium）
"""
import os
import base64
import subprocess
import sys
import tempfile
import time
import urllib.request
from urllib.parse import quote, unquote

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

BASE = None  # 由子进程分配的随机端口决定
failures = []

# 1×1 透明 GIF：用来顶掉测试里的外网请求（见下面 page.route 的说明）
TINY_GIF = base64.b64decode("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7")


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

        # 只放行本机假服务器，外网请求一律用一张 1×1 透明像素顶掉。
        #
        # 起因：桩数据里有一个 example.com 的图片链接，浏览器会**真的去请求外网**。
        # 外网一慢或不通，那个请求就一直挂着，`wait_until="networkidle"` 永远等不到
        # —— 这套测试因此被挂断过两次，而且看起来像"代码坏了"，极难排查。
        #
        # 为什么不是 route.abort()：abort 会在控制台留下 net::ERR_FAILED，
        # 把最后那条「控制台无错误」的断言污染掉。给一个能解码的 1×1 GIF 最干净。
        page.route(
            "**/*",
            lambda route: route.continue_()
            if route.request.url.startswith(BASE)
            else route.fulfill(status=200, content_type="image/gif", body=TINY_GIF),
        )

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
        # 新页面入口小卡：三张卡要都在，且徽章数字与数据源一致。
        # 标签数来自 /api/posts 的 unique tags（stub 是 3 个），
        # 壁纸数来自 gallery.data.js 静态清单（= 图床实际张数）。
        for href in ("/tag.html", "/stats.html", "/gallery.html"):
            check(
                f"首页 入口卡 {href} 已挂上",
                page.locator(f'a.card-mini[href="{href}"]').count() == 1,
            )
        check(
            "首页 标签卡徽章与列表去重一致",
            page.locator("#home-tag-badge").inner_text() == "3 个标签",
            page.locator("#home-tag-badge").inner_text(),
        )
        gallery_badge = page.locator("#home-gallery-badge").inner_text()
        check(
            "首页 壁纸卡徽章与清单一致",
            gallery_badge.replace(" 张壁纸", "").isdigit() and int(gallery_badge.replace(" 张壁纸", "")) >= 1,
            gallery_badge,
        )
        # 搜索框只在博客/归档/标签页上。别的页面按 "/" 不能"什么都没发生"，
        # 而要带人过去并在落地时把光标放进搜索框（URL 里的 #search 就是干这个的）。
        check("首页 本身没有搜索框", page.locator("#blog-search").count() == 0)
        page.keyboard.press("/")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(500)
        check("首页 按 / 跳到博客页", "blog.html" in page.url, page.url)
        check(
            "首页 按 / 落地后搜索框已聚焦",
            page.evaluate("() => !!document.activeElement && document.activeElement.id === 'blog-search'"),
            page.evaluate(
                "() => document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : 'none'"
            ),
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

        page.goto(BASE + "/tag.html", wait_until="networkidle")
        check("标签 导航已注入", page.locator(".nav-container").count() == 1)
        check("标签 标题为标签", "标签" in page.locator(".blog-hero h1").inner_text())
        # 桩数据里三个标签（代码 / 生活 / 自建服务），加「全部」= 4 个 chip
        check(
            "标签 标签云含全部+3个标签",
            page.locator(".tag-chip").count() == 4,
            page.locator(".tag-chip").count(),
        )
        check("标签 默认列出全部文章", page.locator(".archive-item").count() == 3)
        check("标签 总数已填充", page.locator("#tag-post-count").inner_text() == "03")
        page.locator('.tag-chip[data-tag="代码"]').click()
        page.wait_for_timeout(300)
        check(
            "标签 点标签后 URL 变成可分享的 ?t=",
            "%E4%BB%A3%E7%A0%81" in page.url or "代码" in unquote(page.url),
            page.url,
        )
        check("标签 只列出该标签的 2 篇", page.locator(".archive-item").count() == 2)
        check(
            "标签 当前标签高亮",
            page.locator('.tag-chip[data-tag="代码"]').get_attribute("aria-pressed") == "true",
        )
        check(
            "标签 列表里不再重复当前标签",
            page.locator(".archive-item-tag", has_text="代码").count() == 0,
        )
        page.fill("#tag-search", "第三篇")
        page.wait_for_timeout(400)
        check("标签 搜索在当前标签下过滤", page.locator(".archive-item").count() == 0)
        # 分享链接：直接带 ?t= 打开也应该在那个标签上
        page.goto(BASE + "/tag.html?t=" + quote("自建服务"), wait_until="networkidle")
        page.wait_for_timeout(300)
        check("标签 直接打开带 ?t= 的链接即落在该标签", page.locator(".archive-item").count() == 2)
        check(
            "标签 该标签 chip 为激活态",
            page.locator('.tag-chip[data-tag="自建服务"]').get_attribute("aria-pressed") == "true",
        )
        # 指向不存在/已删除的标签要能优雅退化，不能白屏
        page.goto(BASE + "/tag.html?t=" + quote("不存在的标签"), wait_until="networkidle")
        page.wait_for_timeout(300)
        check("标签 未知标签退化为全部文章", page.locator(".archive-item").count() == 3)
        # 退化之后高亮的应该是「全部」那一枚（data-tag 为空串），而不是没有高亮、
        # 也不是把某个不存在的标签留在激活态。
        active_chip = page.locator(".tag-chip.is-active")
        check(
            "标签 未知标签退化为高亮「全部」",
            active_chip.count() == 1
            and (active_chip.first.get_attribute("data-tag") or "") == "",
            f'{active_chip.count()} 个高亮, data-tag={active_chip.first.get_attribute("data-tag") if active_chip.count() else "?"}',
        )
        page.goto(BASE + "/tag.html", wait_until="networkidle")
        page.wait_for_timeout(300)
        if shot_dir:
            page.screenshot(path=os.path.join(shot_dir, "tag.png"), full_page=True)

        # 「现在」页：目前只搭了框架、内容待填，所以**故意不进导航**。
        # 这里只验框架本身是好的（标题 / 内容块 / 日期脚本），不管内容。
        page.goto(BASE + "/now.html", wait_until="networkidle")
        check("现在 标题为现在", "现在" in page.locator(".blog-hero h1").inner_text())
        check("现在 三个内容块", page.locator("[data-now-block]").count() == 3)
        updated = page.locator("#now-updated").inner_text()
        check("现在 最后更新日期已填充", bool(updated) and updated != "—", updated)
        check("现在 导航尚未挂链接（内容填好后才挂）", page.locator('a[href="/now.html"]').count() == 0)

        # 壁纸页。张数会随用户加图变化，所以断言只绑定"页面自洽"，
        # 不绑定具体数字（绑死数字的断言迟早会因为加了几张图而变红）。
        page.goto(BASE + "/gallery.html", wait_until="networkidle")
        check("壁纸 导航已注入", page.locator(".nav-container").count() == 1)
        check("壁纸 标题为壁纸", "壁纸" in page.locator(".blog-hero h1").inner_text())
        thumb_count = page.locator(".gallery-item").count()
        check("壁纸 网格里有缩略图", thumb_count >= 1, thumb_count)
        check(
            "壁纸 头部张数与网格一致",
            page.locator("#gallery-count").inner_text() == "%02d" % thumb_count,
            f'{page.locator("#gallery-count").inner_text()} vs {thumb_count}',
        )
        # 懒加载是这页的命门：30 张原图共 75 MB，不懒加载首屏就废了
        lazy_ok = page.evaluate(
            """() => {
              const imgs = [...document.querySelectorAll('.gallery-thumb')];
              return imgs.length > 0 && imgs.every(i => i.getAttribute('loading') === 'lazy');
            }"""
        )
        check("壁纸 缩略图全部懒加载（否则一页几十兆）", lazy_ok)
        # 列表里必须是缩略图，不能是原图
        first_src = page.locator(".gallery-thumb").first.get_attribute("src") or ""
        check("壁纸 列表里挂的是本地缩略图", first_src.startswith("/img/wallpaper/"), first_src)
        page.locator(".gallery-item").first.click()
        page.wait_for_timeout(700)
        check("壁纸 点缩略图打开灯箱", page.locator(".lightbox-overlay").count() == 1)
        light_src = page.locator(".lightbox-image").get_attribute("src") or ""
        check("壁纸 灯箱请求的是原图（不是缩略图）", "/Wallpaper/" in light_src, light_src[:70])
        check("壁纸 灯箱有「查看/下载原图」链接", page.locator(".lightbox-link").count() == 1)
        check("壁纸 灯箱标出第几张", "/" in page.locator(".lightbox-caption").inner_text())
        page.keyboard.press("Escape")
        page.wait_for_timeout(400)
        check("壁纸 Esc 关闭灯箱", page.locator(".lightbox-overlay").count() == 0)

        # 统计页。?until= 把热力图窗口钉死在 stub 数据所在的那一周，
        # 否则「哪几天该亮」的断言会依赖跑测试那天的日期，过一年就全红。
        # 统计页。?until= 把热力图窗口钉死在 stub 数据所在的那一周，
        # 否则「哪几天该亮」的断言会依赖跑测试那天的日期，过一年就全红。
        page.goto(BASE + "/stats.html?until=2026-10-11", wait_until="networkidle")
        page.wait_for_timeout(400)  # 等逐篇详情的字数汇总回来
        check("统计 标题含写作", "写作" in page.locator(".blog-hero h1").inner_text())
        check("统计 导航已挂链接", page.locator('a[href="/stats.html"]').count() >= 1)
        check("统计 概览文章数与列表一致", page.locator("#stat-posts").inner_text() == "3", page.locator("#stat-posts").inner_text())
        check("统计 概览评论数与列表一致", page.locator("#stat-comments").inner_text() == "2", page.locator("#stat-comments").inner_text())
        check("统计 概览标签数已去重", page.locator("#stat-tags").inner_text() == "3", page.locator("#stat-tags").inner_text())
        words_total = page.locator("#stat-words").inner_text()
        check("统计 字数已汇总（逐篇详情拉取）", words_total not in ("—", "0"), words_total)
        heat = page.evaluate(
            """() => {
              const cells = [...document.querySelectorAll('#heatmap-cells span')];
              const lit = cells.filter(c => c.dataset.level);
              return {
                cells: cells.length,
                litTitles: lit.map(c => c.title),
                levels: [...new Set(lit.map(c => c.dataset.level))],
                months: document.querySelectorAll('#heatmap-months span').length,
              };
            }"""
        )
        check("统计 热力图格子数在一年窗口内", 350 <= heat["cells"] <= 380, heat["cells"])
        # 月份行每周一个占位 span（1 行 × N 列），格子行 7 行 × N 列：两行列数相同才对齐。
        # 关系是 months == ceil(cells / 7)（最后一列可能不满 7 天）。
        check(
            "统计 月份行与格子行列数一致（对齐前提）",
            heat["months"] == -(-heat["cells"] // 7),
            f'{heat["months"]} vs ceil({heat["cells"]}/7)',
        )
        check("统计 亮格恰好是发文的三天", len(heat["litTitles"]) == 3, heat["litTitles"])
        check("统计 亮格 title 带日期与篇数", all("2026-10-0" in t and "1 篇" in t for t in heat["litTitles"]), heat["litTitles"])
        check("统计 亮格档位都是 1（各 1 篇）", heat["levels"] == ["1"], heat["levels"])
        check("统计 标签条 3 条", page.locator(".stats-tag-row").count() == 3)
        year_rows = page.locator(".stats-year-row").count()
        check("统计 按年至少 1 行", year_rows >= 1, year_rows)
        # 自洽：stub 三篇全在 2026，年度字数必须等于总字数（两处口径一致才相等地了）
        check("统计 年度字数与总字数自洽", page.locator(".stats-year-words").first.inner_text() == words_total, page.locator(".stats-year-words").first.inner_text())

        # 留言板。提交走桩的兜底 201；先审后发意味着提交成功后列表**不变**。
        page.goto(BASE + "/guestbook.html", wait_until="networkidle")
        check("留言 标题含留言板", "留言板" in page.locator(".blog-hero h1").inner_text())
        check("留言 导航已挂链接", page.locator('a[href="/guestbook.html"]').count() >= 1)
        nickname_prefill = page.locator("#guestbook-nickname").input_value()
        check("留言 昵称已自动预填", bool(nickname_prefill), nickname_prefill)
        list_count = page.locator("#guestbook-list .comment-item").count()
        check("留言 列表渲染出桩数据", list_count == 2, list_count)
        check("留言 头部条数与列表一致", page.locator("#guestbook-count").inner_text() == "2", page.locator("#guestbook-count").inner_text())
        page.fill("#guestbook-content", "测试留言：e2e 自动化提交")
        page.click("#guestbook-submit")
        page.wait_for_timeout(600)
        check(
            "留言 提交后提示等待审核",
            "已提交" in page.locator("#guestbook-status").inner_text(),
            page.locator("#guestbook-status").inner_text(),
        )
        check(
            "留言 先审后发：提交不改变列表",
            page.locator("#guestbook-list .comment-item").count() == 2,
        )

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
        # 系列导航：桩里 id 1(10-03) 和 id 2(10-04) 都带「自建服务」，构成 2 篇的系列。
        # 当前这篇是 10-03，按日期升序排第 1 —— 顺序错了读者会被倒着带。
        series_info = page.evaluate(
            """() => {
              const box = document.getElementById('article-series');
              if (!box) return null;
              const rows = [...box.querySelectorAll('.article-series-item')];
              return {
                hidden: box.hasAttribute('hidden'),
                visible: getComputedStyle(box).display !== 'none',
                count: rows.length,
                first: rows[0] ? rows[0].textContent.trim() : '',
                firstIsCurrent: rows[0] ? rows[0].classList.contains('is-current') : false,
                secondHref: rows[1] ? (rows[1].querySelector('a') || {}).getAttribute?.('href') : '',
                nameHref: (box.querySelector('.article-series-name') || {}).getAttribute?.('href'),
                countText: (box.querySelector('.article-series-count') || {}).textContent || '',
              };
            }"""
        )
        check("文章 系列导航已显示", bool(series_info) and not series_info["hidden"] and series_info["visible"], series_info)
        check("文章 系列里列出 2 篇", bool(series_info) and series_info["count"] == 2, series_info and series_info["count"])
        check(
            "文章 系列按日期升序（当前这篇是第 1 篇）",
            bool(series_info) and series_info["firstIsCurrent"] and "当前这篇" in series_info["first"],
            series_info and series_info["first"],
        )
        check(
            "文章 系列第 2 条指向另一篇",
            bool(series_info) and series_info["secondHref"] == "post.html?id=2",
            series_info and series_info["secondHref"],
        )
        check(
            "文章 系列名链到标签页（可看全量）",
            bool(series_info) and (series_info["nameHref"] or "").startswith("tag.html?t="),
            series_info and series_info["nameHref"],
        )
        check(
            "文章 系列标注「第 1 / 共 2 篇」",
            bool(series_info) and "第 1" in series_info["countText"] and "2" in series_info["countText"],
            series_info and series_info["countText"],
        )
        check("文章 表情回应栏 4 个按钮", page.locator("#article-reactions .article-reaction").count() == 4)
        check("文章 代码块有复制按钮", page.locator("#article-body .code-copy-btn").count() == 3)
        # 行号是「每行一个 grid 行」渲染的（.code-line > .code-line-no + .code-line-text），
        # 所以折行不会让数字错位——这正是「永远有行号」与「长行软换行」能同时成立的原因。
        # 桩里 pre[0] 是 3 行短代码，pre[1] 是 1 行超长命令。
        line_info = page.evaluate(
            """() => {
              const pres = [...document.querySelectorAll('#article-body pre')];
              const dump = (pre) => {
                if (!pre) return null;
                const code = pre.querySelector('code');
                const no = pre.querySelector('.code-line-no');
                return {
                  cls: pre.classList.contains('has-line-numbers'),
                  nums: [...pre.querySelectorAll('.code-line-no')].map(n => n.textContent),
                  lineText: [...pre.querySelectorAll('.code-line-text')].map(n => n.textContent).join('\\n'),
                  // 溢出量要在 <code> 上量：hljs 给 .hljs 带了 overflow-x:auto，
                  // 真正会横向滚动的是 code 那一层，pre.scrollWidth 恒等于 clientWidth。
                  overflow: code ? code.scrollWidth - code.clientWidth : 0,
                  numFont: no ? getComputedStyle(no).fontSize : '',
                  preFont: getComputedStyle(pre).fontSize,
                };
              };
              return { short: dump(pres[0]), long: dump(pres[1]) };
            }"""
        )
        short_block = (line_info or {}).get("short")
        long_block = (line_info or {}).get("long")
        check(
            "文章 两个代码块都渲染了行号",
            bool(short_block) and bool(long_block) and short_block["cls"] and long_block["cls"],
            line_info,
        )
        check(
            "文章 短块行号逐行且从 1 开始",
            bool(short_block) and short_block["nums"] == ["1", "2", "3"],
            short_block and short_block["nums"],
        )
        check(
            "文章 超长行块也有行号（本次改动核心：不再为了折行而撤掉行号）",
            bool(long_block) and long_block["nums"] == ["1"],
            long_block and long_block["nums"],
        )
        check(
            "文章 行号字号与代码一致（否则对不齐）",
            bool(short_block) and short_block["numFont"] == short_block["preFont"],
            short_block and f"{short_block['numFont']} / {short_block['preFont']}",
        )
        check(
            "文章 行号不进正文文本（复制不能带上数字）",
            bool(short_block)
            and short_block["lineText"].startswith("npm install")
            and "\n1\n" not in short_block["lineText"],
            short_block and repr(short_block["lineText"][:30]),
        )
        check(
            "文章 按行拼回时换行完整（复制出来仍是多行代码）",
            bool(short_block)
            and short_block["lineText"].split("\n") == ["npm install", "npm run build", "npm run test"],
            short_block and repr(short_block["lineText"]),
        )
        check(
            "文章 超长行块没有横向溢出（等于没有滚动条）",
            bool(long_block) and long_block["overflow"] <= 1,
            long_block and long_block["overflow"],
        )
        # 跨行 token：多行字符串在 hljs 里是**一个** <span>，切行时必须把它在每行各复制一份。
        # 这是切行实现里风险最高的路径——切坏了要么丢高亮、要么文本错乱。
        span_info = page.evaluate(
            """() => {
              const pres = [...document.querySelectorAll('#article-body pre')];
              const pre = pres[2];
              if (!pre) return null;
              const rows = [...pre.querySelectorAll('.code-line')];
              return {
                nums: [...pre.querySelectorAll('.code-line-no')].map(n => n.textContent),
                texts: rows.map(r => r.querySelector('.code-line-text').textContent),
                contHasSpan: rows[1] ? !!rows[1].querySelector('.code-line-text span') : false,
              };
            }"""
        )
        check(
            "文章 跨行 token 切行后行号正确（2 行）",
            bool(span_info) and span_info["nums"] == ["1", "2"],
            span_info and span_info["nums"],
        )
        check(
            "文章 跨行 token 切行后文本完整（没被切开或丢字）",
            bool(span_info) and span_info["texts"] == ["const s = `alpha", "beta`;"],
            span_info and span_info["texts"],
        )
        check(
            "文章 跨行 token 的续行仍带着 hljs 标签（祖先链被正确复制）",
            bool(span_info) and span_info["contHasSpan"],
            span_info and span_info["contHasSpan"],
        )
        # 真的点一次复制按钮，用剪贴板验"纯代码 + 换行都在"——
        # 行号现在是真实元素，页面上的 textContent 一定含数字，只有剪贴板能证明没带上。
        page.context.grant_permissions(["clipboard-read", "clipboard-write"])
        page.locator("#article-body pre").first.hover()
        page.wait_for_timeout(200)
        page.locator("#article-body .code-copy-btn").first.click()
        page.wait_for_timeout(500)
        copied = page.evaluate("() => navigator.clipboard.readText()")
        # Windows 上 Chromium 写剪贴板会把 \n 规范成 \r\n，所以先归一化再比。
        check(
            "文章 剪贴板里是纯代码（无行号、换行完整）",
            copied.replace("\r\n", "\n") == "npm install\nnpm run build\nnpm run test"
            and "\n1\n" not in copied,
            repr(copied),
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
