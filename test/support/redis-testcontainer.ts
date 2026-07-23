import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createConnection, createServer } from 'node:net';
import { createClient } from 'redis';

export interface RedisTestEnvironment {
  redisUrl: string;
  stop(): Promise<void>;
  start(): Promise<void>;
  restart(): Promise<void>;
  flushDb(): Promise<void>;
  getKeys(pattern: string): Promise<string[]>;
  close(): Promise<void>;
}

export async function createRedisTestEnvironment(): Promise<RedisTestEnvironment> {
  const port = await getFreePort();
  let child: ChildProcessWithoutNullStreams | undefined;
  const redisUrl = `redis://127.0.0.1:${port}`;

  const startProcess = async () => {
    if (child && !child.killed) {
      return;
    }

    child = spawn(
      'redis-server',
      [
        '--bind',
        '127.0.0.1',
        '--port',
        String(port),
        '--save',
        '',
        '--appendonly',
        'no',
      ],
      {
        stdio: 'ignore',
      },
    );

    await waitForRedisToBeReady(redisUrl);
  };

  const stopProcess = async () => {
    if (!child || child.killed) {
      return;
    }

    child.kill('SIGKILL');
    child = undefined;
    await new Promise((resolve) => setTimeout(resolve, 250));
  };

  await startProcess();

  return {
    redisUrl,
    async stop() {
      await stopProcess();
    },
    async start() {
      await startProcess();
    },
    async restart() {
      await stopProcess();
      await startProcess();
    },
    async flushDb() {
      const client = createClient({
        url: redisUrl,
        socket: { connectTimeout: 1000 },
      });
      await client.connect();
      try {
        await client.flushDb();
      } finally {
        await client.quit();
      }
    },
    async getKeys(pattern: string) {
      const client = createClient({
        url: redisUrl,
        socket: { connectTimeout: 1000 },
      });
      await client.connect();
      try {
        return await client.keys(pattern);
      } finally {
        await client.quit();
      }
    },
    async close() {
      await stopProcess();
    },
  };
}

async function getFreePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (typeof address === 'object' && address?.port) {
        const port = address.port;
        server.close((closeError) => {
          if (closeError) {
            reject(closeError);
            return;
          }

          resolve(port);
        });
      } else {
        reject(new Error('Failed to allocate a free port for Redis'));
      }
    });
  });
}

async function waitForRedisToBeReady(redisUrl: string) {
  const { hostname, port } = new URL(redisUrl);
  const deadline = Date.now() + 15000;

  while (Date.now() < deadline) {
    try {
      await waitForTcpPort(hostname, Number(port), 1000);
      return;
    } catch {
      // retry until the process is ready
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Redis at ${redisUrl} did not become ready in time`);
}

async function waitForTcpPort(
  hostname: string,
  port: number,
  timeoutMs: number,
) {
  await new Promise<void>((resolve, reject) => {
    const client = createConnection({ host: hostname, port });
    const timeout = setTimeout(() => {
      client.destroy();
      reject(new Error(`Timed out waiting for ${hostname}:${port}`));
    }, timeoutMs);

    client.once('connect', () => {
      clearTimeout(timeout);
      client.destroy();
      resolve();
    });

    client.once('error', (error) => {
      clearTimeout(timeout);
      client.destroy();
      reject(error);
    });
  });
}
