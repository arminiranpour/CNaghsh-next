import * as execaModule from "execa";
import { transcodeConfig } from "../config.transcode";

type ExecaFn = typeof import("execa").execa;

const resolveExeca = (): ExecaFn => {
  const candidate = execaModule as unknown;

  if (typeof candidate === "function") {
    return candidate as ExecaFn;
  }

  if (
    candidate &&
    typeof (candidate as { execa?: unknown }).execa === "function"
  ) {
    return (candidate as { execa: ExecaFn }).execa;
  }

  if (
    candidate &&
    typeof (candidate as { default?: unknown }).default === "function"
  ) {
    return (candidate as { default: ExecaFn }).default;
  }

  throw new Error("Unable to resolve execa function export");
};

const execa = resolveExeca();

type ProbeStream = {
  codec_type?: string;
  codec_name?: string;
  codec_long_name?: string;
  width?: number;
  height?: number;
  duration?: string | number;
  bit_rate?: string | number;
};

type ProbeFormat = {
  duration?: string;
  bit_rate?: string;
};

type ProbeResponse = {
  streams?: ProbeStream[];
  format?: ProbeFormat;
};

type MediaMetadata = {
  durationSec: number;
  width: number;
  height: number;
  videoCodec: string;
  audioCodec?: string;
  bitrateKbps?: number;
};

const parseNumber = (value: unknown) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const probeMedia = async (inputPath: string): Promise<MediaMetadata> => {
  const { stdout } = await execa(transcodeConfig.ffprobePath, [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_streams",
    "-show_format",
    inputPath,
  ]);

  const parsed = JSON.parse(stdout) as ProbeResponse;
  const streams = parsed.streams ?? [];
  const videoStream = streams.find((stream) => stream.codec_type === "video");
  if (!videoStream) {
    throw new Error("No video stream found in media");
  }

  const audioStream = streams.find((stream) => stream.codec_type === "audio");
  const durationFromFormat = parseNumber(parsed.format?.duration);
  const durationFromVideo = parseNumber(videoStream.duration);
  const durationSec = durationFromFormat ?? durationFromVideo;

  if (!durationSec || durationSec <= 0) {
    throw new Error("Unable to determine media duration");
  }

  const width = parseNumber(videoStream.width);
  const height = parseNumber(videoStream.height);
  if (!width || !height) {
    throw new Error("Unable to determine video dimensions");
  }

  const bitrateBits =
    parseNumber(parsed.format?.bit_rate) ?? parseNumber(videoStream.bit_rate);
  const bitrateKbps = bitrateBits ? bitrateBits / 1000 : undefined;

  return {
    durationSec,
    width,
    height,
    videoCodec: videoStream.codec_name ?? videoStream.codec_long_name ?? "unknown",
    audioCodec: audioStream?.codec_name ?? audioStream?.codec_long_name ?? undefined,
    bitrateKbps,
  };
};

export type { MediaMetadata };
export { probeMedia };
