export const MEDIA_TRANSCODE_QUEUE_NAME = "media.transcode";

export type MediaTranscodeJobData = {
  mediaAssetId: string;
  attempt: number;
};
