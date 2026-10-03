// 评论正文的 Markdown 子集渲染：**粗体**、*斜体*、`代码`、> 引用、自动链接、换行。
// 全程用 createElement + createTextNode 构建，不写 innerHTML，
// 所以访客写的任何 HTML 标签都只会变成文字，不存在注入的可能。
(function (global) {
  "use strict";

  var INLINE_SOURCE =
    "(\\*\\*[^*\\n]+\\*\\*|\\*[^*\\n]+\\*|`[^`\\n]+`|https?:\\/\\/[^\\s<>\"'，。；：、！？）】]+)";
  var TRAILING_PUNCTUATION = /[.,;:!?]+$/;

  function textNode(doc, target, text) {
    target.appendChild(doc.createTextNode(text));
  }

  function wrap(doc, tag, className, text) {
    var element = doc.createElement(tag);
    element.className = className;
    textNode(doc, element, text);
    return element;
  }

  function link(doc, url) {
    var element = doc.createElement("a");
    element.className = "comment-md-link";
    element.setAttribute("href", url);
    element.setAttribute("target", "_blank");
    element.setAttribute("rel", "nofollow noopener");
    textNode(doc, element, url);
    return element;
  }

  function renderInline(doc, target, text) {
    var pattern = new RegExp(INLINE_SOURCE, "g");
    var cursor = 0;
    var match;
    while ((match = pattern.exec(text)) !== null) {
      if (match.index > cursor) textNode(doc, target, text.slice(cursor, match.index));
      var token = match[0];
      if (token.charAt(0) === "`") {
        target.appendChild(wrap(doc, "code", "comment-md-code", token.slice(1, -1)));
      } else if (token.charAt(1) === "*") {
        target.appendChild(wrap(doc, "strong", "comment-md-strong", token.slice(2, -2)));
      } else if (token.charAt(0) === "*") {
        target.appendChild(wrap(doc, "em", "comment-md-em", token.slice(1, -1)));
      } else {
        var url = token.replace(TRAILING_PUNCTUATION, "");
        target.appendChild(link(doc, url));
        if (url.length !== token.length) textNode(doc, target, token.slice(url.length));
      }
      cursor = match.index + token.length;
    }
    if (cursor < text.length) textNode(doc, target, text.slice(cursor));
  }

  function renderCommentMarkdown(text, doc) {
    var box = doc.createElement("div");
    box.className = "comment-item-body";
    var lines = String(text === null || text === undefined ? "" : text).split("\n");
    for (var index = 0; index < lines.length; index += 1) {
      var raw = lines[index];
      var quoted = /^>\s?/.test(raw);
      var content = quoted ? raw.replace(/^>\s?/, "") : raw;
      var line = doc.createElement("p");
      line.className = quoted ? "comment-md-line comment-md-quote" : "comment-md-line";
      if (content) renderInline(doc, line, content);
      else line.className += " comment-md-blank";
      box.appendChild(line);
    }
    return box;
  }

  global.renderCommentMarkdown = renderCommentMarkdown;
})(typeof window !== "undefined" ? window : globalThis);
