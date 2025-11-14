const cacheHlsSegment = () => "public, max-age=31536000, immutable";

const cacheHlsManifest = () => "public, max-age=120";

const cachePoster = () => "public, max-age=31536000, immutable";

const cacheOriginal = () => "private, max-age=0, no-store";

export { cacheHlsManifest, cacheHlsSegment, cacheOriginal, cachePoster };
