import { z } from "zod";

const variantSchema = z.object({
  name: z.string().min(1),
  width: z.coerce.number().int().positive(),
  height: z.coerce.number().int().positive(),
  videoBitrateKbps: z.coerce.number().int().positive(),
  audioBitrateKbps: z.coerce.number().int().positive(),
});

type VariantConfig = z.infer<typeof variantSchema>;

const parseVariants = z
  .string()
  .transform((value, ctx) => {
    try {
      const parsed = JSON.parse(value);
      return parsed;
    } catch (error) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "HLS_VARIANTS must be valid JSON" });
      return z.NEVER;
    }
  })
  .pipe(z.array(variantSchema).min(1));

const schema = z.object({
  FFMPEG_PATH: z.string().min(1),
  FFPROBE_PATH: z.string().min(1),
  HLS_SEGMENT_DURATION_SEC: z.coerce.number().positive(),
  HLS_PLAYLIST_NAME: z.string().min(1),
  HLS_VARIANTS: parseVariants,
  HLS_POSTER_TIME_FRACTION: z.coerce.number().min(0).max(1),
});

const defaultVariants: VariantConfig[] = [
  { name: "240p", width: 426, height: 240, videoBitrateKbps: 400, audioBitrateKbps: 64 },
  { name: "480p", width: 854, height: 480, videoBitrateKbps: 800, audioBitrateKbps: 96 },
  { name: "720p", width: 1280, height: 720, videoBitrateKbps: 2500, audioBitrateKbps: 128 },
];

const raw = schema.parse({
  FFMPEG_PATH: process.env.FFMPEG_PATH ?? "ffmpeg",
  FFPROBE_PATH: process.env.FFPROBE_PATH ?? "ffprobe",
  HLS_SEGMENT_DURATION_SEC: process.env.HLS_SEGMENT_DURATION_SEC ?? "6",
  HLS_PLAYLIST_NAME: process.env.HLS_PLAYLIST_NAME ?? "index.m3u8",
  HLS_VARIANTS: process.env.HLS_VARIANTS ?? JSON.stringify(defaultVariants),
  HLS_POSTER_TIME_FRACTION: process.env.HLS_POSTER_TIME_FRACTION ?? "0.5",
});

const transcodeConfig = {
  ffmpegPath: raw.FFMPEG_PATH,
  ffprobePath: raw.FFPROBE_PATH,
  segmentDurationSec: raw.HLS_SEGMENT_DURATION_SEC,
  playlistName: raw.HLS_PLAYLIST_NAME,
  variants: raw.HLS_VARIANTS,
  posterTimeFraction: raw.HLS_POSTER_TIME_FRACTION,
};

export { transcodeConfig };
export type { VariantConfig };
