declare namespace NodeJS {
  interface ProcessEnv {
    [key: string]: string | undefined;
  }
  interface Timeout {}
}

declare var process: {
  env: NodeJS.ProcessEnv;
  cwd(): string;
};

declare function setTimeout(
  handler: (...args: any[]) => void,
  timeout?: number,
  ...args: any[]
): NodeJS.Timeout;

declare function clearTimeout(timeoutId: NodeJS.Timeout): void;

declare function setInterval(
  handler: (...args: any[]) => void,
  timeout?: number,
  ...args: any[]
): NodeJS.Timeout;

declare function clearInterval(intervalId: NodeJS.Timeout): void;

export {};