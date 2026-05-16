#!/usr/bin/env python3
import re
import json
from pathlib import Path
from html import unescape

ROOT = Path(__file__).resolve().parent.parent
POSTS_DIR = ROOT / 'posts'
OUT_FILE = POSTS_DIR / 'posts.json'

files = sorted(POSTS_DIR.glob('*.html'))
posts = []

def extract_between(pattern, text):
    m = re.search(pattern, text, re.S)
    return unescape(m.group(1).strip()) if m else ''

for p in files:
    text = p.read_text(encoding='utf-8')
    title = extract_between(r'<h1[^>]*class=["\']post-title["\'][^>]*>(.*?)</h1>', text)
    date = extract_between(r'<span[^>]*class=["\']post-date["\'][^>]*>(.*?)</span>', text)
    # tags may be multiple
    tags = re.findall(r'<span[^>]*class=["\']post-tag["\'][^>]*>(.*?)</span>', text, re.S)
    tags = [unescape(t.strip()) for t in tags]
    desc = extract_between(r'<meta name=["\']description["\'] content=["\'](.*?)["\']', text)
    if not desc:
        # try first paragraph in article
        desc = extract_between(r'<div[^>]*class=["\']article-content["\'][^>]*>\s*<p>(.*?)</p>', text)
    cover = extract_between(r'<img[^>]*src=["\'](.*?)["\'][^>]*>', text)
    post = {
        'id': p.stem,
        'title': title or p.stem,
        'date': date or '',
        'tags': tags,
        'description': desc or '',
        'cover': cover or '',
        'url': f'posts/{p.name}'
    }
    posts.append(post)

# write
OUT_FILE.write_text(json.dumps(posts, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Wrote {len(posts)} posts to {OUT_FILE}')
