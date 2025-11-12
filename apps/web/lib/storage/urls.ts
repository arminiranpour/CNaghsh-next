import { storageConfig } from "./config";

const encodeKey = (key: string) =>
  key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

const publicBaseUrl = (bucket: string, key: string) => {
  const normalizedKey = encodeKey(key.replace(/^\/+/, ""));
  if (storageConfig.endpoint) {
    const base = new URL(storageConfig.endpoint);
    const path = base.pathname.endsWith("/") ? base.pathname.slice(0, -1) : base.pathname;
    return `${base.protocol}//${base.host}${path}/${bucket}/${normalizedKey}`;
  }
  if (storageConfig.forcePathStyle) {
    return `https://s3.${storageConfig.region}.amazonaws.com/${bucket}/${normalizedKey}`;
  }
  return `https://${bucket}.s3.${storageConfig.region}.amazonaws.com/${normalizedKey}`;
};

export { publicBaseUrl };
