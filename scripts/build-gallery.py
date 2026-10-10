"""为相册页生成缩略图。

为什么必须有这一步：Wallpaper/ 下 30 张共 74.9 MB，平均 2.5 MB、最大 18.1 MB。
直接铺在页面上，手机滚一遍就是几十兆。缩略图（480px 宽、JPEG q78）能把
"浏览"这一步压到 1 MB 级；原图只在点开看大图/下载时才取。

产出的东西：
  <站点仓库>/img/wallpaper/<stem>.jpg   缩略图
  <站点仓库>/gallery.data.js            相册清单（页面读它，不直连 GitHub API）

用法：python scripts/build-gallery.py [--out 目录]
      --out 默认是站点仓库根目录。指向别处就能在别的机器上跑（比如本机跨境线路
      太慢时，把脚本丢到服务器上跑，只把生成的缩略图传回来——75 MB 原图不必过境）。
      需要 Pillow。
"""
import argparse
import io
import json
import os
import sys
import time
import urllib.request

from PIL import Image

REPO_DEFAULT = os.path.join(os.path.dirname(os.path.abspath(__file__)), os.pardir)
OWNER_REPO = "LLllCCC/tuchaung"
DIR = "Wallpaper"
CDN = "https://cdn.jsdelivr.net/gh/" + OWNER_REPO + "@main/"
THUMB_WIDTH = 480
THUMB_QUALITY = 78


def api(path):
    url = "https://api.github.com/repos/" + OWNER_REPO + "/contents/" + path
    req = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def fetch(url, expect=None, tries=4):
    """下载并校验字节数。这条跨境线路会截断响应，必须按 Content-Length 比对。"""
    last = None
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "gallery-builder"})
            with urllib.request.urlopen(req, timeout=180) as resp:
                data = resp.read()
            if expect is None or len(data) == expect:
                return data
            last = "拿到 %d 字节，期望 %d" % (len(data), expect)
        except Exception as exc:  # noqa: BLE001
            last = repr(exc)
        time.sleep(1.5 * (attempt + 1))
    raise RuntimeError("下载失败 %s：%s" % (url, last))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=REPO_DEFAULT, help="输出根目录（默认：站点仓库）")
    args = parser.parse_args()

    out_root = os.path.abspath(args.out)
    out_dir = os.path.join(out_root, "img", "wallpaper")
    data_file = os.path.join(out_root, "gallery.data.js")
    os.makedirs(out_dir, exist_ok=True)

    entries = sorted(api(DIR), key=lambda x: x["name"])
    print("远端 %d 张，总计 %.1f MB" % (len(entries), sum(e["size"] for e in entries) / 1024 / 1024), flush=True)

    manifest = []
    total_thumb = 0
    for index, entry in enumerate(entries, 1):
        name = entry["name"]
        stem = os.path.splitext(name)[0]
        thumb_path = os.path.join(out_dir, stem + ".jpg")

        if os.path.exists(thumb_path) and os.path.getsize(thumb_path) > 0:
            print("  [%2d/%d] %s 已有缩略图，跳过" % (index, len(entries), name), flush=True)
            with Image.open(thumb_path) as im:
                tw, th = im.size
        else:
            try:
                raw = fetch(CDN + DIR + "/" + name, expect=entry["size"])
            except RuntimeError as exc:
                print("  [%2d/%d] %s 跳过：%s" % (index, len(entries), name, exc), flush=True)
                continue
            with Image.open(io.BytesIO(raw)) as im:
                im = im.convert("RGB")  # PNG 可能是 RGBA / P 模式，统一成 JPEG 能存的
                orig_w, orig_h = im.size
                ratio = THUMB_WIDTH / float(orig_w)
                # 宽度不超过 THUMB_WIDTH 的图不放大——放大会变大又变糊
                if ratio < 1:
                    im = im.resize((THUMB_WIDTH, max(1, round(orig_h * ratio))), Image.LANCZOS)
                tw, th = im.size
                im.save(thumb_path, "JPEG", quality=THUMB_QUALITY, optimize=True, progressive=True)
                print(
                    "  [%2d/%d] %s  %dx%d -> %dx%d  %dKB -> %dKB"
                    % (
                        index,
                        len(entries),
                        name,
                        orig_w,
                        orig_h,
                        tw,
                        th,
                        entry["size"] // 1024,
                        os.path.getsize(thumb_path) // 1024,
                    ),
                    flush=True,
                )

        total_thumb += os.path.getsize(thumb_path)
        manifest.append(
            {
                "file": name,
                "thumb": "/img/wallpaper/" + stem + ".jpg",
                # 缩略图尺寸要带上：灯箱靠它算占位比例，避免大图加载时页面跳动
                "w": tw,
                "h": th,
            }
        )

    with open(data_file, "w", encoding="utf-8") as fh:
        fh.write("// 由 scripts/build-gallery.py 生成，不要手改。\n")
        fh.write("// 图片存在图床仓库 " + OWNER_REPO + "/" + DIR + "，缩略图在 img/wallpaper/。\n")
        fh.write("export const GALLERY_SOURCE = " + json.dumps(DIR, ensure_ascii=False) + ";\n")
        fh.write("export const GALLERY_CDN = " + json.dumps(CDN + DIR + "/", ensure_ascii=False) + ";\n")
        fh.write("export const GALLERY = " + json.dumps(manifest, ensure_ascii=False, indent=2) + ";\n")

    print()
    print("清单写入 %s：%d 张" % (data_file, len(manifest)), flush=True)
    print("缩略图总体积 %.1f MB -> 浏览整页只需这么多" % (total_thumb / 1024 / 1024), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
