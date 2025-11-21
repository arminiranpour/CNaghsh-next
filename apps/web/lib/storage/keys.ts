const normalizeSegment = (value: string) => value.replace(/^\/+|\/+$/g, "");

const normalizeExt = (ext: string) => {
  const trimmed = ext.trim();
  if (trimmed.startsWith(".")) {
    return trimmed.slice(1);
  }
  return trimmed;
};

const joinKey = (...parts: string[]) =>
  parts
    .map((part) => normalizeSegment(part))
    .filter((part) => part.length > 0)
    .join("/");

const getOriginalKey = (ownerUserId: string, mediaId: string, ext: string) => {
  const safeExt = normalizeExt(ext);
  if (safeExt.length === 0) {
    throw new Error("File extension is required for original uploads");
  }
  return joinKey("uploads/originals", ownerUserId, `${mediaId}.${safeExt}`);
};

const getHlsManifestKey = (mediaId: string) => {
  return joinKey("processed/hls", mediaId, "index.m3u8");
};

const getHlsVariantPrefix = (mediaId: string, variant: string) => {
  return joinKey("processed/hls", mediaId, `v${variant}`);
};

const getPosterKey = (mediaId: string) => {
  return joinKey("processed/posters", `${mediaId}.jpg`);
};

export { getHlsManifestKey, getHlsVariantPrefix, getOriginalKey, getPosterKey };
