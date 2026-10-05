// 评论 Markdown 渲染器的测试：用假 DOM 断言「渲染结果里不可能出现访客写的标签」。
// 用法：node scripts/test-comment-markdown.mjs
const { renderCommentMarkdown: render } = await import("../comment-markdown.js");

function makeDoc() {
  return {
    createElement(tag) {
      return {
        tagName: tag,
        className: "",
        attrs: {},
        children: [],
        setAttribute(name, value) {
          this.attrs[name] = String(value);
        },
        appendChild(child) {
          this.children.push(child);
          return child;
        },
      };
    },
    createTextNode(value) {
      return { textNode: true, value: String(value) };
    },
  };
}

function walk(node, visit) {
  visit(node);
  (node.children || []).forEach((child) => walk(child, visit));
}

function elements(box) {
  const list = [];
  walk(box, (node) => {
    if (!node.textNode) list.push(node);
  });
  return list;
}

function allText(node) {
  if (node.textNode) return node.value;
  return node.children.map(allText).join("");
}

function renderText(text) {
  return render(text, makeDoc());
}

let passed = 0;
let failed = 0;

function check(name, condition, detail) {
  if (condition) {
    passed += 1;
    console.log("  ok   " + name);
  } else {
    failed += 1;
    console.error("  FAIL " + name + (detail === undefined ? "" : " -> " + JSON.stringify(detail)));
  }
}

console.log("评论 Markdown 渲染测试");

check("渲染函数存在", typeof render === "function");

const scriptText = "<script>alert(1)</script>";
const scriptBox = renderText(scriptText);
check(
  "访客写的 script 不会变成标签",
  !elements(scriptBox).some((node) => node.tagName.toLowerCase() === "script"),
  elements(scriptBox).map((node) => node.tagName)
);
check("script 原文作为文字保留", allText(scriptBox) === scriptText, allText(scriptBox));

const imgBox = renderText('<img src=x onerror="alert(1)">');
check(
  "img 标签与事件属性都不会出现",
  !elements(imgBox).some((node) => node.tagName.toLowerCase() === "img") &&
    elements(imgBox).every((node) => !("onerror" in node.attrs)),
  elements(imgBox).map((node) => node.attrs)
);

const jsUrlBox = renderText("看 [点我](javascript:alert(1)) 和 data:text/html,<b>x</b>");
check(
  "javascript: 与 data: 都不会被做成链接",
  !elements(jsUrlBox).some((node) => /^(javascript|data):/i.test(node.attrs.href || "")),
  elements(jsUrlBox)
    .filter((node) => node.tagName === "a")
    .map((node) => node.attrs)
);

const url = "https://example.com/a?b=1&c=2";
const linkBox = renderText("参考 " + url + " 结束");
const anchor = elements(linkBox).find((node) => node.tagName === "a");
check(
  "http/https 链接被做成 a 标签并带安全属性",
  anchor &&
    anchor.attrs.href === url &&
    anchor.attrs.target === "_blank" &&
    anchor.attrs.rel === "nofollow noopener",
  anchor?.attrs
);

const trailingBox = renderText("地址 https://example.com。");
const trailingAnchor = elements(trailingBox).find((node) => node.tagName === "a");
check(
  "中文句号不算进链接",
  trailingAnchor?.attrs.href === "https://example.com" &&
    allText(trailingBox) === "地址 https://example.com。",
  { href: trailingAnchor?.attrs.href, text: allText(trailingBox) }
);

const styleBox = renderText("**粗** 和 *斜* 以及 `代码`");
const styled = elements(styleBox).filter((node) => ["strong", "em", "code"].includes(node.tagName));
check(
  "粗体/斜体/行内代码各自成节点",
  styled.length === 3 &&
    styled[0].tagName === "strong" &&
    allText(styled[0]) === "粗" &&
    styled[1].tagName === "em" &&
    allText(styled[1]) === "斜" &&
    styled[2].tagName === "code" &&
    allText(styled[2]) === "代码",
  styled.map((node) => [node.tagName, allText(node)])
);

const lines = elements(renderText("第一行\n第二行\n第三行")).filter((node) => node.tagName === "p");
check("换行拆成多个块", lines.length === 3 && allText(lines[1]) === "第二行", lines.length);

const quoteBox = renderText("> 这是引用\n普通行");
const quoteLines = elements(quoteBox).filter((node) => node.tagName === "p");
check(
  "> 开头识别为引用行",
  quoteLines[0].className.includes("comment-md-quote") && allText(quoteLines[0]) === "这是引用",
  quoteLines.map((node) => node.className)
);

const blankBox = renderText("上行\n\n下行");
check(
  "空行保留成占位行",
  elements(blankBox).filter((node) => node.tagName === "p").length === 3 &&
    elements(blankBox).some((node) => node.className.includes("comment-md-blank")),
  elements(blankBox).map((node) => node.className)
);

const unclosedBox = renderText("**没有闭合 和 `反引号 和 > 不在行首");
check(
  "未闭合的标记原样显示，不产生节点",
  elements(unclosedBox).every((node) => ["div", "p"].includes(node.tagName)) &&
    allText(unclosedBox) === "**没有闭合 和 `反引号 和 > 不在行首",
  allText(unclosedBox)
);

const longBox = renderText("字".repeat(1000) + "\n" + "https://example.com/".repeat(40));
check("超长内容不抛错且文字完整", allText(longBox).startsWith("字".repeat(1000)));

const emptyBox = renderText("");
check(
  "空内容渲染出一个占位行",
  elements(emptyBox).filter((node) => node.tagName === "p").length === 1
);
check(
  "容器是 div.comment-item-body",
  emptyBox.tagName === "div" && emptyBox.className === "comment-item-body"
);

console.log(failed ? "\n失败 " + failed + " 项" : "\n全部 " + passed + " 项通过");
process.exit(failed ? 1 : 0);
