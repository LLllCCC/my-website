// 标签工具 + 系列/合集的定义。
//
// 系列为什么用「标签约定」而不是给 posts 表加一列：见知识库「为什么默认不动表」——
// 表结构和代码必须同时改，而后端是 push 后 cron 自动部署、表却是手工改的，顺序一错
// 就报错；标签约定则零数据库变更、随时可回退。
//
// 代价是约定要靠纪律维持，所以新增一个系列只有两步：
//   1) 在 SERIES_TAGS 里加一个标签名
//   2) 给这个系列的文章打上同名标签
// 成员永远 = 「带该标签的文章」，不另外维护 id 清单——清单一定会和文章漂移。

export const SERIES_TAGS = ["自建服务"];

// "a, b, c" / ["a", "b"] / null → ["a", "b", "c"]（去首尾空格、丢掉空项）
export function splitTags(value) {
  const raw = Array.isArray(value)
    ? value.map(String)
    : String(value == null ? "" : value).split(",");
  return raw
    .map(function (tag) {
      return tag.trim();
    })
    .filter(Boolean);
}

export function tagSetOf(value) {
  return new Set(splitTags(value));
}

// 文章所属的系列名（一篇同时命中多个系列标签时取第一个；没有则返回空串）
export function seriesOfPost(post) {
  if (!post) return "";
  const hit = splitTags(post.tags).filter(function (tag) {
    return SERIES_TAGS.indexOf(tag) !== -1;
  });
  return hit.length ? hit[0] : "";
}

// 系列成员排序：按日期升序 —— 「第 1 篇」必须是系列里最早那篇，
// 否则读者按顺序读会被倒着带。日期缺失的排到最后。
export function sortByDateAsc(posts) {
  return posts.slice().sort(function (a, b) {
    const timeA = Date.parse((a && a.date) || "") || 0;
    const timeB = Date.parse((b && b.date) || "") || 0;
    if (timeA !== timeB) return timeA - timeB;
    return Number((a && a.id) || 0) - Number((b && b.id) || 0);
  });
}
