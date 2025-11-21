import {
  getHlsManifestCacheControl,
  getHlsSegmentCacheControl,
  getOriginalCacheControl,
  getPosterCacheControl,
} from "@/lib/media/cache-config";

const cacheHlsSegment = () => getHlsSegmentCacheControl();

const cacheHlsManifest = () => getHlsManifestCacheControl();

const cachePoster = () => getPosterCacheControl();

const cacheOriginal = () => getOriginalCacheControl();

export { cacheHlsManifest, cacheHlsSegment, cacheOriginal, cachePoster };
