// Pages Function：/gh-img/* 同域反代 GitHub 图床（上游是 api.888431.xyz 的同名代理）。
// 与 /api 不同：图片内容不变，必须吃满 CF 边缘缓存——
// 用 Cache API 在 Function 前面挡一层，命中就不出 Function、不回源。
// 上游 nginx 本身已带 Cache-Control: public, max-age=30d，这里透传给浏览器。
const UPSTREAM = "https://api.888431.xyz";

export async function onRequest(context) {
  const { request, waitUntil } = context;
  const url = new URL(request.url);
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const cache = caches.default;
  const cached = await cache.match(request);
  if (cached) return cached;

  const target = UPSTREAM + url.pathname + url.search;
  const headers = new Headers(request.headers);
  headers.delete("host");
  const upstreamResp = await fetch(target, { headers: headers, redirect: "manual" });

  const outHeaders = new Headers(upstreamResp.headers);
  outHeaders.delete("content-encoding");
  outHeaders.delete("content-length");

  const resp = new Response(upstreamResp.body, {
    status: upstreamResp.status,
    statusText: upstreamResp.statusText,
    headers: outHeaders,
  });
  // 只缓存成功响应；失败的（404/5xx）不进缓存，重试还有机会成功。
  if (upstreamResp.ok) {
    waitUntil(cache.put(request, resp.clone()));
  }
  return resp;
}
