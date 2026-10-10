"""端到端测试的本地假接口：托管仓库静态文件 + 伪造 /api 响应，不连真实服务器。"""
import json
import mimetypes
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

POSTS = [
    {"id": 3, "title": "第三篇文章", "date": "2026-10-05", "description": "三", "tags": "生活", "cover": "", "comment_count": 0},
    {"id": 2, "title": "第二篇文章", "date": "2026-10-04", "description": "二", "tags": "代码,自建服务", "cover": "", "comment_count": 0},
    {"id": 1, "title": "ESM 验证文章", "date": "2026-10-03", "description": "第一篇", "tags": "代码,生活,自建服务", "cover": "", "comment_count": 2},
]
# 留言板：两条已审核留言。列表形状与真实接口一致（id/nickname/content/created_at）。
GUESTBOOK = [
    {"id": 2, "nickname": "晚风柴犬456", "content": "第二回合，站点越来越顺眼了。", "created_at": "2026-10-05T09:30:00.000Z"},
    {"id": 1, "nickname": "青柠水母123", "content": "第一句话留在你的留言板上！", "created_at": "2026-10-05T08:00:00.000Z"},
]
POST_1 = {
    "id": 1,
    "title": "ESM 验证文章",
    "date": "2026-10-03T00:00:00.000Z",
    # 自建服务：系列标签（series.js 的 SERIES_TAGS）。id 1(10-03) 和 id 2(10-04)
    # 都带它，于是构成一个 2 篇的系列，文章页的系列导航才有的可测。
    "tags": "代码,生活,自建服务",
    "cover": "",
    "older": None,
    "newer": {"id": 2, "title": "第二篇文章"},
    "content": (
        "开篇一段话。\n\n## 安装步骤\n\n正文里有 **粗体** 和一个 [图片链接](https://example.com/a.jpg)。\n\n"
        # 刻意用多行代码块：代码行号只对 2 行以上生效（单行加行号是噪音），
        # 单行的话这条特性在 e2e 里就永远测不到。
        "```bash\nnpm install\nnpm run build\nnpm run test\n```\n\n"
        # 刻意放一行超长命令：用来验证「长行照样有行号 + 不出现横向滚动条」。
        # 长度要远超正文列宽（约 104 字符），所以它在任何视口下都必然折行。
        "```bash\n"
        "docker run -d --name my-blog-api --restart unless-stopped -p 172.17.0.1:3000:3000 "
        "--env-file /root/myblog-api/.env myblog-api:latest\n"
        "```\n\n"
        # 刻意的**跨行 token**：多行字符串在 highlight.js 里是**一个** <span>，
        # 切行时必须把这个 span 在每一行各复制一份，否则要么标签被切坏、
        # 要么续行丢掉高亮。这是切行实现里风险最高的一条路径，必须有永久用例。
        "```js\nconst s = `alpha\nbeta`;\n```\n\n## 注意事项\n\n结尾。\n"
    ),
}
# id 2 / 3 的详情：统计页要逐篇拉正文算字数，没有这两条就只测得到"详情失败"的分支。
# content 长度刻意不同，方便人工核对汇总数字；older/newer 形状与真实接口一致。
POST_2 = {
    "id": 2,
    "title": "第二篇文章",
    "date": "2026-10-04T00:00:00.000Z",
    "tags": "代码,自建服务",
    "cover": "",
    "older": {"id": 1, "title": "ESM 验证文章"},
    "newer": {"id": 3, "title": "第三篇文章"},
    "content": "第二篇的正文。\n\n## 一节\n\n内容简短一些，但不是空的。",
}
POST_3 = {
    "id": 3,
    "title": "第三篇文章",
    "date": "2026-10-05T00:00:00.000Z",
    "tags": "生活",
    "cover": "",
    "older": {"id": 2, "title": "第二篇文章"},
    "newer": None,
    "content": "第三篇，生活随记。",
}
COMMENTS_1 = [
    {
        "id": 1,
        "nickname": "青柠水母123",
        "content": "**棒**！顺便安利 https://example.com",
        "created_at": "2026-10-05T08:00:00.000Z",
        "parent_id": None,
        "reply_to": None,
        "reactions": [{"emoji": "👍", "count": 1}],
    },
    {
        "id": 2,
        "nickname": "晚风柴犬456",
        "content": "同感，`post.js` 拆得漂亮",
        "created_at": "2026-10-05T08:05:00.000Z",
        "parent_id": 1,
        "reply_to": "青柠水母123",
        "reactions": [],
    },
]


def search_posts(keyword):
    """假搜索：按标题/摘要/标签命中，并带上正文片段，形状与真实接口一致。"""
    keyword = (keyword or "").strip().lower()
    if not keyword:
        return []
    hits = []
    for post in POSTS:
        haystack = " ".join(
            str(post.get(field, "")) for field in ("title", "description", "tags")
        ).lower()
        if keyword in haystack:
            hits.append({**post, "snippet": post.get("description", "")})
    return hits


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def guess_type(self, path):
        if path.endswith((".js", ".mjs")):
            return "text/javascript"
        if path.endswith(".css"):
            return "text/css"
        return mimetypes.guess_type(path)[0] or "application/octet-stream"

    def send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/api/posts":
            return self.send_json(POSTS)
        if path == "/api/guestbook":
            return self.send_json(GUESTBOOK)
        # 搜索要排在 /api/posts/1 之前判断，否则 "search" 会被当成文章编号。
        if path == "/api/posts/search":
            return self.send_json(search_posts(self.query_keyword("q")))
        if path == "/api/posts/1":
            return self.send_json(POST_1)
        if path == "/api/posts/2":
            return self.send_json(POST_2)
        if path == "/api/posts/3":
            return self.send_json(POST_3)
        if path == "/api/posts/1/reactions":
            return self.send_json({"reactions": [{"emoji": "👍", "count": 2}]})
        if path == "/api/posts/1/comments":
            return self.send_json(COMMENTS_1)
        if path.startswith("/api/posts/") and path.endswith("/comments"):
            return self.send_json([])
        return super().do_GET()

    def query_keyword(self, name):
        """取出查询串里某个参数的值（已做百分号解码）。"""
        from urllib.parse import parse_qs, urlparse

        values = parse_qs(urlparse(self.path).query).get(name, [])
        return values[0] if values else ""

    def do_POST(self):
        if self.path.startswith("/api/comments/") and self.path.endswith("/reactions"):
            return self.send_json({"active": True, "reactions": [{"emoji": "👍", "count": 2}]})
        if self.path.startswith("/api/posts/") and self.path.endswith("/reactions"):
            return self.send_json({"active": True, "reactions": [{"emoji": "👍", "count": 3}]})
        return self.send_json({"message": "Comment queued"}, status=201)

    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    import sys

    # 默认用随机端口，避免和残留进程冲突；实际端口通过 PORT= 行打印给调用方。
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print("PORT=" + str(server.server_address[1]), flush=True)
    server.serve_forever()
