"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize, Minimize, Pause, Play, Volume2, VolumeX } from "lucide-react";

import { cn } from "@/lib/utils";

export type VideoPlayerProps = {
  mediaId: string;
  manifestUrl?: string;
  playbackKind: "public-direct" | "private-proxy";
  posterUrl?: string | null;
  autoPlayMuted?: boolean;
  loop?: boolean;
  className?: string;
};

type HlsConstructor = typeof import("hls.js") extends { default: infer T } ? T : never;
type HlsInstance = InstanceType<HlsConstructor>;
type HlsErrorData = import("hls.js").ErrorData;

const VideoPlayer = ({
  mediaId,
  manifestUrl,
  playbackKind,
  posterUrl,
  autoPlayMuted = true,
  loop = false,
  className,
}: VideoPlayerProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<HlsInstance | null>(null);
  const [hasIntersected, setHasIntersected] = useState(false);
  const manifestEndpoint = useMemo(() => {
    if (playbackKind === "private-proxy") {
      return manifestUrl ?? `/api/media/${mediaId}/manifest`;
    }
    return manifestUrl ?? null;
  }, [mediaId, manifestUrl, playbackKind]);
  const [resolvedManifestUrl, setResolvedManifestUrl] = useState<string | null>(
    playbackKind === "public-direct" ? manifestEndpoint : null,
  );
  const [isResolving, setIsResolving] = useState(playbackKind === "private-proxy");
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(autoPlayMuted !== false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setHasIntersected(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (playbackKind === "public-direct") {
      if (!manifestEndpoint) {
        setError("پخش ویدیو ممکن نیست.");
        return;
      }
      setResolvedManifestUrl(manifestEndpoint);
      setIsResolving(false);
    } else {
      setResolvedManifestUrl(null);
      setIsResolving(true);
    }
  }, [manifestEndpoint, playbackKind]);

  useEffect(() => {
    if (playbackKind !== "private-proxy") {
      return;
    }
    if (!hasIntersected) {
      return;
    }
    if (!manifestEndpoint) {
      setError("پخش ویدیو ممکن نیست.");
      setIsResolving(false);
      return;
    }
    if (resolvedManifestUrl) {
      return;
    }
    let active = true;
    const controller = new AbortController();
    setIsResolving(true);
    setError(null);
    fetch(manifestEndpoint, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP_${response.status}`);
        }
        return response.json() as Promise<{ ok?: boolean; url?: string }>;
      })
      .then((data) => {
        if (!active) {
          return;
        }
        if (!data?.ok || typeof data.url !== "string") {
          throw new Error("INVALID_RESPONSE");
        }
        setResolvedManifestUrl(data.url);
        setIsResolving(false);
      })
      .catch((reason) => {
        if (!active) {
          return;
        }
        if ((reason as Error)?.name === "AbortError") {
          return;
        }
        setError("پخش ویدیو ممکن نیست.");
        setIsResolving(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [manifestEndpoint, playbackKind, hasIntersected, resolvedManifestUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    if (!hasIntersected || !resolvedManifestUrl) {
      return;
    }
    setIsReady(false);
    const canPlayNative = video.canPlayType("application/vnd.apple.mpegurl");
    if (canPlayNative) {
      if (video.src !== resolvedManifestUrl) {
        video.src = resolvedManifestUrl;
      }
      return;
    }
    let cancelled = false;
    const setup = async () => {
      const hlsModule = await import("hls.js");
      if (cancelled) {
        return;
      }
      const Hls = hlsModule.default;
      if (!Hls.isSupported()) {
        setError("پخش ویدیو ممکن نیست.");
        return;
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      const instance = new Hls({ enableWorker: true });
      hlsRef.current = instance;
      instance.attachMedia(video);
      instance.on(Hls.Events.MEDIA_ATTACHED, () => {
        instance.loadSource(resolvedManifestUrl);
      });
      instance.on(Hls.Events.ERROR, (_event: unknown, data: HlsErrorData) => {
        if (data?.fatal) {
          setError("پخش ویدیو ممکن نیست.");
        }
      });
    };
    setup();
    return () => {
      cancelled = true;
    };
  }, [resolvedManifestUrl, hasIntersected]);

  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    video.muted = isMuted;
  }, [isMuted]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    setIsMuted(autoPlayMuted !== false);
  }, [autoPlayMuted]);

  const isLoading =
    isResolving ||
    (playbackKind === "private-proxy" && !resolvedManifestUrl) ||
    (!isReady && !error && Boolean(resolvedManifestUrl));
  const shouldAutoplay = autoPlayMuted !== false;

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || !resolvedManifestUrl || error) {
      return;
    }
    if (video.paused) {
      void video
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          setError("پخش ویدیو ممکن نیست.");
        });
    } else {
      video.pause();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const next = !isMuted;
    video.muted = next;
    setIsMuted(next);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const element = document.fullscreenElement;
    if (element) {
      void document.exitFullscreen();
      return;
    }
    if (video.requestFullscreen) {
      void video.requestFullscreen();
      return;
    }
    const fallback = video as unknown as { webkitEnterFullscreen?: () => void };
    fallback.webkitEnterFullscreen?.();
  };

  const PlayPauseIcon = isPlaying ? Pause : Play;
  const VolumeIcon = isMuted ? VolumeX : Volume2;

  const showControls = !error;

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative overflow-hidden rounded-xl bg-black">
        <div className="aspect-video w-full bg-black">
          <video
            ref={videoRef}
            className="h-full w-full bg-black object-contain"
            autoPlay={shouldAutoplay && Boolean(resolvedManifestUrl)}
            muted={isMuted}
            loop={loop}
            poster={posterUrl ?? undefined}
            playsInline
            preload="metadata"
            onClick={togglePlay}
            onPlay={() => {
              setIsPlaying(true);
              setError(null);
            }}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            onLoadedData={() => {
              setIsReady(true);
              setError(null);
            }}
            onCanPlay={() => setIsReady(true)}
            onWaiting={() => setIsReady(false)}
            onStalled={() => setIsReady(false)}
            onError={() => setError("پخش ویدیو ممکن نیست.")}
            onVolumeChange={(event) => setIsMuted(event.currentTarget.muted)}
          />
        </div>
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-white">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            <p className="text-sm">در حال بارگذاری ویدیو...</p>
          </div>
        ) : null}
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 px-6 text-center text-sm text-white">
            <span>پخش ویدیو ممکن نیست.</span>
          </div>
        ) : null}
        {showControls ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/80 to-transparent px-4 py-3 text-white"
            dir="ltr"
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/20 transition hover:bg-white/30"
                aria-label={isPlaying ? "توقف" : "پخش"}
                disabled={!resolvedManifestUrl}
              >
                <PlayPauseIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={toggleMute}
                className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/20 transition hover:bg-white/30"
                aria-label={isMuted ? "فعال کردن صدا" : "قطع صدا"}
                disabled={!resolvedManifestUrl}
              >
                <VolumeIcon className="h-5 w-5" />
              </button>
            </div>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/20 transition hover:bg-white/30"
              aria-label={isFullscreen ? "خروج از تمام‌صفحه" : "نمایش تمام‌صفحه"}
              disabled={!resolvedManifestUrl}
            >
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default VideoPlayer;
