import { Readable } from "node:stream";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type GetObjectCommandOutput,
  type HeadObjectCommandOutput,
  type PutObjectCommandOutput,
} from "@aws-sdk/client-s3";

import { storageConfig } from "./config";

type PutInput = {
  bucket: string;
  key: string;
  body: Buffer | Uint8Array | string | Readable;
  contentType?: string;
  cacheControl?: string;
  acl?: "public-read" | undefined;
};

const s3 = new S3Client({
  region: storageConfig.region,
  credentials: {
    accessKeyId: storageConfig.accessKey,
    secretAccessKey: storageConfig.secretKey,
  },
  forcePathStyle: storageConfig.forcePathStyle,
  endpoint: storageConfig.endpoint,
});

const head = async (bucket: string, key: string): Promise<HeadObjectCommandOutput> => {
  return s3.send(
    new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
};

const hasAsyncIterator = (value: unknown): value is AsyncIterable<unknown> => {
  return typeof (value as { [Symbol.asyncIterator]?: () => AsyncIterator<unknown> })[Symbol.asyncIterator] === "function";
};

const exists = async (bucket: string, key: string) => {
  try {
    await head(bucket, key);
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "NotFound" ||
        error.name === "NoSuchKey" ||
        (typeof (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === "number" &&
          (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404))
    ) {
      return false;
    }
    throw error;
  }
};

const getStream = async (bucket: string, key: string) => {
  const response: GetObjectCommandOutput = await s3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
  const body = response.Body;
  if (!body) {
    throw new Error("S3 object body is empty");
  }
  if (body instanceof Readable) {
    return body;
  }
  if (typeof (body as { getReader?: () => unknown }).getReader === "function") {
    if (typeof (Readable as unknown as { fromWeb?: unknown }).fromWeb === "function") {
      return (Readable as unknown as { fromWeb: (stream: ReadableStream<Uint8Array>) => Readable }).fromWeb(
        body as ReadableStream<Uint8Array>,
      );
    }
    const reader = (body as ReadableStream<Uint8Array>).getReader();
    const iterator = {
      async *[Symbol.asyncIterator]() {
        while (true) {
          const result = await reader.read();
          if (result.done) {
            reader.releaseLock();
            return;
          }
          yield result.value;
        }
      },
    };
    return Readable.from(iterator as AsyncIterable<Uint8Array>);
  }
  if (typeof body === "string" || body instanceof Uint8Array || Array.isArray(body)) {
    return Readable.from(body as Iterable<unknown>);
  }
  if (hasAsyncIterator(body)) {
    return Readable.from(body);
  }
  throw new Error("Unsupported S3 object body type");
};

const put = async ({ bucket, key, body, contentType, cacheControl, acl }: PutInput) => {
  const input = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: cacheControl,
    ACL: acl,
  });
  const result: PutObjectCommandOutput = await s3.send(input);
  return result;
};

const putStream = async (
  bucket: string,
  key: string,
  stream: Readable,
  contentType?: string,
  cacheControl?: string,
  acl?: "public-read" | undefined,
) => {
  return put({ bucket, key, body: stream, contentType, cacheControl, acl });
};

const putBuffer = async (
  bucket: string,
  key: string,
  buffer: Buffer | Uint8Array,
  contentType?: string,
  cacheControl?: string,
  acl?: "public-read" | undefined,
) => {
  return put({ bucket, key, body: buffer, contentType, cacheControl, acl });
};

const putJson = async (
  bucket: string,
  key: string,
  value: unknown,
  cacheControl?: string,
  acl?: "public-read" | undefined,
) => {
  const buffer = Buffer.from(JSON.stringify(value));
  return put({ bucket, key, body: buffer, contentType: "application/json", cacheControl, acl });
};

const remove = async (bucket: string, key: string) => {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
};

export { exists, getStream, head, putBuffer, putJson, putStream, remove, s3 };
