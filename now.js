// 「现在」页：从 /api/now 拉当前快照，填三块内容 + 最后更新时间。
// 内容在 /admin.html 的「现在」编辑区改，保存即上线——不用动这页代码。
import { CONFIG, formatDateTime } from "./config.js?v=49";

document.addEventListener("DOMContentLoaded", async function () {
  const updatedEl = document.getElementById("now-updated");
  const blocks = [...document.querySelectorAll("[data-now-block]")];

  let data;
  try {
    const response = await fetch(CONFIG.API_BASE + "/now", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
    data = await response.json();
  } catch (_) {
    if (updatedEl) updatedEl.textContent = "读取失败";
    blocks.forEach((block) => {
      const ul = block.querySelector("ul");
      if (ul) ul.replaceChildren(document.createTextNode("暂时读不到内容，稍后刷新看看。"));
    });
    return;
  }

  if (updatedEl) {
    updatedEl.textContent = data && data.updated_at ? formatDateTime(data.updated_at) : "—";
  }
  if (!data) return;

  // 三块按 data-field 对应字段；空字段整段隐藏，不露占位文字。
  blocks.forEach((block) => {
    const field = block.dataset.field;
    const text = (data[field] || "").trim();
    if (!text) {
      block.hidden = true;
      return;
    }
    block.hidden = false;
    const ul = block.querySelector("ul");
    if (!ul) return;
    ul.replaceChildren();
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const li = document.createElement("li");
        li.textContent = line;
        ul.appendChild(li);
      });
  });
});
