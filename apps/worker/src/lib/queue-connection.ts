import { Queue, QueueEvents, type QueueEventsOptions, type QueueOptions } from "bullmq";

import { redis } from "./redis";

const createConnection = () => redis.duplicate();

export const createQueue = (name: string, options?: QueueOptions) =>
  new Queue(name, { ...options, connection: createConnection() });

export const createQueueEvents = (name: string, options?: QueueEventsOptions) =>
  new QueueEvents(name, { ...options, connection: createConnection() });

export const createWorkerConnection = () => createConnection();
