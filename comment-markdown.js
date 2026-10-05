// 评论正文的 Markdown 子集渲染：**粗体**、*斜体*、`代码`、> 引用、自动链接、换行。
// 全程用 createElement + createTextNode 构建，不写 innerHTML，
// 所以访客写的任何 HTML 标签都只会变成文字，不存在注入的可能。
const INLINE_SOURCE =
  "(\\*\\*[^*\\n]+\\*\\*|\\*[^*\\n]+\\*|`[^`\\n]+`|https?:\\/\\/[^\\s<>\"'，。；：、！？）】]+)";
const TRAILING_PUNCTUATION = /[.,;:!?]+$/;

function textNode(doc, target, text) {
  target.appendChild(doc.createTextNode(text));
}

function wrap(doc, tag, className, text) {
  const element = doc.createElement(tag);
  element.className = className;
  textNode(doc, element, text);
  return element;
}

function link(doc, url) {
  const element = doc.createElement("a");
  element.className = "comment-md-link";
  element.setAttribute("href", url);
  element.setAttribute("target", "_blank");
  element.setAttribute("rel", "nofollow noopener");
  textNode(doc, element, url);
  return element;
}

function renderInline(doc, target, text) {
  const pattern = new RegExp(INLINE_SOURCE, "g");
  let cursor = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) textNode(doc, target, text.slice(cursor, match.index));
    const token = match[0];
    if (token.charAt(0) === "`") {
      target.appendChild(wrap(doc, "code", "comment-md-code", token.slice(1, -1)));
    } else if (token.charAt(1) === "*") {
      target.appendChild(wrap(doc, "strong", "comment-md-strong", token.slice(2, -2)));
    } else if (token.charAt(0) === "*") {
      target.appendChild(wrap(doc, "em", "comment-md-em", token.slice(1, -1)));
    } else {
      const url = token.replace(TRAILING_PUNCTUATION, "");
      target.appendChild(link(doc, url));
      if (url.length !== token.length) textNode(doc, target, token.slice(url.length));
    }
    cursor = match.index + token.length;
  }
  if (cursor < text.length) textNode(doc, target, text.slice(cursor));
}

export function renderCommentMarkdown(text, doc) {
  const box = doc.createElement("div");
  box.className = "comment-item-body";
  const lines = String(text === null || text === undefined ? "" : text).split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    const quoted = /^>\s?/.test(raw);
    const content = quoted ? raw.replace(/^>\s?/, "") : raw;
    const line = doc.createElement("p");
    line.className = quoted ? "comment-md-line comment-md-quote" : "comment-md-line";
    if (content) renderInline(doc, line, content);
    else line.className += " comment-md-blank";
    box.appendChild(line);
  }
  return box;
}
