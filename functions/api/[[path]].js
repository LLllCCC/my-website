// Pages Function：/api/* 同域反代到现有后端。
// 背景：大陆部分 ISP 到 CF 给 888431.xyz zone 分配的网段（104.21.x）TCP 不可达，
// 但 Pages 网段（172.66.x）可达——所以把 API 也收进站点同域，从 Pages 出。
// 上游仍是 api.888431.xyz（CF 内部回环，能通）；若某天回环被 zone 规则挡，
// 换成 VPS 直连方案即可，本文件只需改 UPSTREAM 一个常量。
//
// 关键约定：后端按 X-Forwarded-For 第一段取访客 IP 做限流（lib/validate.js 的 clientIp）。
// Function 的 fetch 在 CF 看来是"新客户端"，CF 会把回环 IP 追加进 XFF——
// 所以必须显式把访客真实 IP（CF-Connecting-IP）写成 XFF 第一段，否则全站访客共用一个限流桶。
const UPSTREAM = "https://api.888431.xyz";

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // 健康检查：部署即生效的最小验证点，不走上游。
  if (url.pathname === "/api/__ping") {
    return new Response(JSON.stringify({ ok: true, ts: new Date().toISOString() }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  const target = UPSTREAM + url.pathname + url.search;
  const headers = new Headers(request.headers);
  // 回环请求不能带原站 Host，否则上游 CF 按该 Host 匹配缓存/规则会把请求又引回本站。
  headers.delete("host");
  // 访客真实 IP 写进 XFF 首段 + X-Real-IP（后端 clientIp 的取值顺序：XFF 首段 → X-Real-IP → socket）。
  const visitor = request.headers.get("cf-connecting-ip") || "";
  if (visitor) {
    headers.set("x-forwarded-for", visitor);
    headers.set("x-real-ip", visitor);
  } else {
    headers.delete("x-forwarded-for");
    headers.delete("x-real-ip");
  }

  const upstreamResp = await fetch(target, {
    method: request.method,
    headers: headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "manual",
  });

  // 上游可能带 gzip 的 content-encoding + content-length，
  // Response 重新组包后长度已变，保留会被浏览器当坏响应。
  const outHeaders = new Headers(upstreamResp.headers);
  outHeaders.delete("content-encoding");
  outHeaders.delete("content-length");
  // API 响应不该被边缘缓存（文章列表会滞后）。
  outHeaders.set("Cache-Control", "no-store");
  return new Response(upstreamResp.body, {
    status: upstreamResp.status,
    statusText: upstreamResp.statusText,
    headers: outHeaders,
  });
}
