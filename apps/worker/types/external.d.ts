declare module "execa" {
  export type ExecaChildProcess = unknown;
  export type ExecaReturnValue = {
    stdout: string;
    stderr: string;
    exitCode: number;
  };
  export interface ExecaOptions {
    cwd?: string;
    env?: Record<string, string | undefined>;
    reject?: boolean;
    timeout?: number;
  }
  export function execa(
    file: string,
    args?: readonly string[],
    options?: ExecaOptions,
  ): Promise<ExecaReturnValue>;
}

declare module "@aws-sdk/client-s3" {
  export interface S3ClientConfig {
    region?: string;
    endpoint?: string;
    forcePathStyle?: boolean;
    credentials?: {
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken?: string;
    };
  }
  export class S3Client {
    constructor(config?: S3ClientConfig);
    send<T>(command: T): Promise<Record<string, unknown>>;
  }
  export class GetObjectCommand {
    constructor(input: Record<string, unknown>);
  }
  export class PutObjectCommand {
    constructor(input: Record<string, unknown>);
  }
}

declare module "bullmq" {
  export interface QueueOptions {
    connection: unknown;
  }
  export interface QueueEventsOptions {
    connection: unknown;
  }
  export interface WorkerOptions {
    connection: unknown;
    concurrency?: number;
    settings?: Record<string, unknown>;
  }
  export interface JobsOptions {
    attempts?: number;
    backoff?: unknown;
    removeOnComplete?: boolean | number;
    removeOnFail?: boolean | number;
  }
  export interface Job<T = unknown, R = unknown> {
    id: string;
    name: string;
    data: T;
    attemptsMade: number;
    returnvalue?: R;
  }
  export class Queue<T = unknown> {
    constructor(name: string, options: QueueOptions);
    add(name: string, data: T, options?: JobsOptions): Promise<Job<T>>;
    addBulk(jobs: Array<{ name: string; data: T; opts?: JobsOptions }>): Promise<Job<T>[]>;
  }
  export class QueueEvents {
    constructor(name: string, options: QueueEventsOptions);
    on(event: string, handler: (...args: any[]) => void): void;
    close(): Promise<void>;
    waitUntilReady(): Promise<void>;
  }
  export class Worker<T = unknown, R = unknown> {
    constructor(name: string, processor: (job: Job<T>) => Promise<R>, options: WorkerOptions);
    on(event: string, handler: (...args: any[]) => void): void;
    close(): Promise<void>;
    waitUntilReady(): Promise<void>;
  }
}

declare module "ioredis" {
  export interface RedisOptions {
    host?: string;
    port?: number;
    password?: string;
    username?: string;
    db?: number;
    maxRetriesPerRequest?: number | null;
    enableReadyCheck?: boolean;
  }
  export default class Redis {
    constructor(options?: RedisOptions | string);
    constructor(connection: string, options?: RedisOptions);
    constructor(port: number, host?: string, options?: RedisOptions);
    duplicate(): Redis;
    quit(): Promise<void>;
  }
}

declare module "zod" {
  export const z: any;
  export namespace z {
    export type infer<T> = any;
    export const NEVER: never;
    export interface RefinementCtx {
      addIssue(issue: { code: unknown; message?: string }): void;
    }
    export enum ZodIssueCode {
      custom = "custom",
    }
  }
  export default z;
}

declare module "@prisma/client" {
  export type MediaType = "image" | "video";
  export const MediaType: {
    readonly image: MediaType;
    readonly video: MediaType;
  };
  export type MediaStatus = "uploaded" | "processing" | "ready" | "failed";
  export const MediaStatus: {
    readonly uploaded: MediaStatus;
    readonly processing: MediaStatus;
    readonly ready: MediaStatus;
    readonly failed: MediaStatus;
  };
  export type MediaVisibility = "public" | "private";
  export const MediaVisibility: {
    readonly public: MediaVisibility;
    readonly private: MediaVisibility;
  };
  export type TranscodeJobStatus = "queued" | "processing" | "done" | "failed";
  export const TranscodeJobStatus: {
    readonly queued: TranscodeJobStatus;
    readonly processing: TranscodeJobStatus;
    readonly done: TranscodeJobStatus;
    readonly failed: TranscodeJobStatus;
  };

  export namespace Prisma {
    type JsonPrimitive = string | number | boolean | null;
    export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
    export interface JsonObject {
      [Key: string]: JsonValue;
    }
    export type JsonArray = JsonValue[];
  }

  export class PrismaClient {
    constructor(options?: unknown);
    $transaction<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T>;
    $disconnect(): Promise<void>;
    mediaAsset: {
      findUnique(args: unknown): Promise<any>;
      update(args: unknown): Promise<any>;
    };
    transcodeJob: {
      findFirst(args: unknown): Promise<any>;
      update(args: unknown): Promise<any>;
      create(args: unknown): Promise<any>;
    };
  }
}
