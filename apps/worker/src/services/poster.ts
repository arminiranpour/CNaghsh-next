import { execa } from "execa";

import { transcodeConfig } from "../config.transcode";

const clampPosterTime = (durationSec: number, posterTimeFraction: number) => {
  const safeDuration = Number.isFinite(durationSec) && durationSec > 0 ? durationSec : 1;
  const raw = safeDuration * posterTimeFraction;
  const maxTimestamp = Math.max(safeDuration - 1, 1);
  const minTimestamp = Math.min(1, maxTimestamp);
  let timestamp = Math.min(Math.max(raw, minTimestamp), maxTimestamp);
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    timestamp = Math.min(Math.max(safeDuration / 2, minTimestamp), maxTimestamp);
  }
  if (timestamp >= safeDuration) {
    timestamp = Math.max(safeDuration - 0.1, minTimestamp);
  }
  return timestamp;
};

const generatePoster = async (
  inputPath: string,
  outputPath: string,
  durationSec: number,
  posterTimeFraction: number,
): Promise<void> => {
  const timestampSec = clampPosterTime(durationSec, posterTimeFraction);
  await execa(transcodeConfig.ffmpegPath, [
    "-y",
    "-ss",
    timestampSec.toFixed(2),
    "-i",
    inputPath,
    "-frames:v",
    "1",
    "-q:v",
    "2",
    outputPath,
  ]);
};

export { generatePoster };
