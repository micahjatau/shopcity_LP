import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../src/bootstrap';

let serverPromise: Promise<
  (request: IncomingMessage, response: ServerResponse) => void
>;

async function createServerlessHandler() {
  const app = await createApp({ enableShutdownHooks: false });
  const fastify = app.getHttpAdapter().getInstance();

  await fastify.ready();

  return (request: IncomingMessage, response: ServerResponse) => {
    fastify.server.emit('request', request, response);
  };
}

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  serverPromise ??= createServerlessHandler();
  const server = await serverPromise;

  server(request, response);
}
