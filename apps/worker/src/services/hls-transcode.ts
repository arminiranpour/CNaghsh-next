import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

import { execa } from "execa";

import { transcodeConfig, type VariantConfig } from "../config.transcode";

type HlsVariantOutput = {
  name: string;
  playlistPath: string;
  segmentPaths: string[];
};

type HlsResult = {
  manifestPath: string;
  variantOutputs: HlsVariantOutput[];
};

const toPosixPath = (value: string) => value.replace(/\\/g, "/");

const buildCommandArgs = (
  inputPath: string,
  variant: VariantConfig,
  segmentDurationSec: number,
  playlistPath: string,
  segmentPattern: string,
) => {
  const videoBitrate = Math.max(variant.videoBitrateKbps, 1);
  const audioBitrate = Math.max(variant.audioBitrateKbps, 1);
  const maxRate = Math.max(Math.round(videoBitrate * 1.2), videoBitrate + 1);
  const bufSize = Math.max(videoBitrate * 2, videoBitrate + 1);
  return [
    "-y",
    "-i",
    inputPath,
    "-vf",
    `scale=w=${variant.width}:h=${variant.height}:force_original_aspect_ratio=decrease:force_divisible_by=2`,
    "-c:v",
    "h264",
    "-profile:v",
    "main",
    "-preset",
    "veryfast",
    "-b:v",
    `${videoBitrate}k`,
    "-maxrate",
    `${maxRate}k`,
    "-bufsize",
    `${bufSize}k`,
    "-sc_threshold",
    "0",
    "-c:a",
    "aac",
    "-b:a",
    `${audioBitrate}k`,
    "-ac",
    "2",
    "-ar",
    "48000",
    "-hls_time",
    `${segmentDurationSec}`,
    "-hls_playlist_type",
    "vod",
    "-hls_segment_filename",
    segmentPattern,
    "-hls_flags",
    "independent_segments",
    "-hls_list_size",
    "0",
    "-f",
    "hls",
    playlistPath,
  ];
};

const transcodeToHls = async (
  inputPath: string,
  outputDir: string,
  playlistName: string,
  variants: VariantConfig[],
  segmentDurationSec: number,
): Promise<HlsResult> => {
  await mkdir(outputDir, { recursive: true });
  const variantOutputs: HlsVariantOutput[] = [];
  for (const variant of variants) {
    const variantDir = join(outputDir, `v${variant.name}`);
    await mkdir(variantDir, { recursive: true });
    const playlistPath = join(variantDir, "index.m3u8");
    const segmentPattern = join(variantDir, "segment_%05d.ts");
    await execa(transcodeConfig.ffmpegPath, buildCommandArgs(inputPath, variant, segmentDurationSec, playlistPath, segmentPattern));
    const files = await readdir(variantDir);
    const segmentPaths = files
      .filter((file) => file.endsWith(".ts"))
      .map((file) => join(variantDir, file))
      .sort();
    variantOutputs.push({
      name: variant.name,
      playlistPath,
      segmentPaths,
    });
  }
  const manifestPath = join(outputDir, playlistName);
  const manifestLines = ["#EXTM3U", "#EXT-X-VERSION:3", "#EXT-X-INDEPENDENT-SEGMENTS"];
  variants.forEach((variant, index) => {
    const variantOutput = variantOutputs[index];
    if (!variantOutput) {
      throw new Error(`Missing HLS output for variant ${variant.name}`);
    }
    const bandwidth = Math.max(Math.round((variant.videoBitrateKbps + variant.audioBitrateKbps) * 1000), 1);
    const averageBandwidth = Math.max(Math.round(bandwidth * 0.95), 1);
    const relativePath = toPosixPath(relative(outputDir, variantOutput.playlistPath));
    manifestLines.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},AVERAGE-BANDWIDTH=${averageBandwidth},RESOLUTION=${variant.width}x${variant.height},CODECS="avc1.4d401f,mp4a.40.2"`,
    );
    manifestLines.push(relativePath);
  });
  await writeFile(manifestPath, `${manifestLines.join("\n")}\n`);
  return { manifestPath, variantOutputs };
};

export type { HlsResult };
export { transcodeToHls };
