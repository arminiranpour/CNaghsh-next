import { createServer } from "node:http";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const port = Number.parseInt(process.env.MEDIA_CDN_DEV_PORT ?? "4000", 10);
const originBase = process.env.MEDIA_ORIGIN_BASE_URL ?? "http://localhost:9000/media-public";
const mountPath = process.env.MEDIA_CDN_DEV_PREFIX ?? "/media";

const normalizedMount = mountPath.endsWith("/") ? mountPath.slice(0, -1) : mountPath;
const normalizedOriginBase = originBase.replace(/\/+$/, "");

const server = createServer(async (req, res) => {
  try {
    if (!req.url) {
      res.statusCode = 400;
      res.end("Invalid request");
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.statusCode = 405;
      res.setHeader("Allow", "GET, HEAD");
      res.end("Method Not Allowed");
      return;
    }
    const baseForRequest = `http://${req.headers.host ?? `localhost:${port}`}`;
    const requestUrl = new URL(req.url, baseForRequest);
    if (!requestUrl.pathname.startsWith(normalizedMount)) {
      res.statusCode = 404;
      res.end("Not Found");
      return;
    }
    const relativePath = requestUrl.pathname.slice(normalizedMount.length).replace(/^\/+/, "");
    const originUrl = `${normalizedOriginBase}/${relativePath}${requestUrl.search}`;
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === "undefined") {
        continue;
      }
      if (Array.isArray(value)) {
        headers.set(key, value.join(","));
      } else {
        headers.set(key, value);
      }
    }
    headers.set("host", new URL(normalizedOriginBase).host);
    const upstream = await fetch(originUrl, {
      method: req.method,
      headers,
    });
    const responseHeaders = Object.fromEntries(upstream.headers.entries());
    res.writeHead(upstream.status, upstream.statusText, responseHeaders);
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    if (upstream.body) {
      await pipeline(Readable.fromWeb(upstream.body as any), res);
    } else {
      res.end();
    }
  } catch (error) {
    console.error("[dev-media-proxy] error", error);
    if (!res.headersSent) {
      res.statusCode = 502;
      res.setHeader("Cache-Control", "no-store");
    }
    res.end("Bad Gateway");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Dev media proxy listening on http://localhost:${port}${normalizedMount}`);
  console.log(`Origin: ${normalizedOriginBase}`);
});
