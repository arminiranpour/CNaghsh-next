declare module "hls.js" {
  export interface HlsConfig {
    enableWorker?: boolean;
    [key: string]: unknown;
  }

  export interface ErrorData {
    fatal?: boolean;
    [key: string]: unknown;
  }

  export type HlsEventName = string;

  export default class Hls {
    constructor(config?: HlsConfig);
    static isSupported(): boolean;
    static Events: {
      MEDIA_ATTACHED: HlsEventName;
      ERROR: HlsEventName;
      [key: string]: HlsEventName;
    };

    attachMedia(media: HTMLMediaElement): void;
    loadSource(source: string): void;
    on(
      event: HlsEventName,
      handler: (event: HlsEventName, data: ErrorData | undefined) => void,
    ): void;
    destroy(): void;
  }
}
