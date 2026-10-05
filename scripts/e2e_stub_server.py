"""端到端测试的本地假接口：托管仓库静态文件 + 伪造 /api 响应，不连真实服务器。"""
import json
import mimetypes
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

POSTS = [
    {"id": 3, "title": "第三篇文章", "date": "2026-10-05", "description": "三", "tags": "生活", "cover": "", "comment_count": 0},
    {"id": 2, "title": "第二篇文章", "date": "2026-10-04", "description": "二", "tags": "代码", "cover": "", "comment_count": 0},
    {"id": 1, "title": "ESM 验证文章", "date": "2026-10-03", "description": "第一篇", "tags": "代码,生活", "cover": "", "comment_count": 2},
]
POST_1 = {
    "id": 1,
    "title": "ESM 验证文章",
    "date": "2026-10-03T00:00:00.000Z",
    "tags": "代码,生活",
    "cover": "",
    "content": "开篇一段话。\n\n## 安装步骤\n\n正文里有 **粗体** 和一个 [图片链接](https://example.com/a.jpg)。\n\n## 注意事项\n\n结尾。\n",
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
        if path == "/api/posts/1":
            return self.send_json(POST_1)
        if path == "/api/posts/1/comments":
            return self.send_json(COMMENTS_1)
        if path.startswith("/api/posts/") and path.endswith("/comments"):
            return self.send_json([])
        return super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/comments/") and self.path.endswith("/reactions"):
            return self.send_json({"active": True, "reactions": [{"emoji": "👍", "count": 2}]})
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
