declare module "bullmq" {
  export class Queue<T = any, R = any, N extends string = string> {
    constructor(name: string, opts?: any);
    add(name: N, data: T, opts?: any): Promise<any>;
  }

  export class Job<T = any> {
    id?: string;
    data: T;
  }

  export class Worker<T = any, R = any, N extends string = string> {
    constructor(
      name: string,
      processor: (job: Job<T>) => Promise<R>,
      opts?: any
    );
    on(event: string, listener: (...args: any[]) => void): this;
  }
}

declare module "ioredis" {
  export default class IORedis {
    constructor(url?: string, opts?: any);
  }
}
