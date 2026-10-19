import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';

export const TEST_SUPABASE_ANON_KEY = 'shopcity-e2e-anon-key';
export const TEST_SUPABASE_SERVICE_ROLE_KEY = 'shopcity-e2e-service-role-key';

function sendJson(response, status, value) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(JSON.stringify(value));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 64 * 1024) throw new Error('payload-too-large');
    chunks.push(Buffer.from(chunk));
  }
  if (size === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function makeUser({ id = randomUUID(), email, password, email_confirm }) {
  const now = new Date().toISOString();
  return {
    id,
    aud: 'authenticated',
    role: 'authenticated',
    email,
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    identities: [],
    email_confirmed_at: email_confirm ? now : null,
    created_at: now,
    updated_at: now,
    _testPassword: password,
  };
}

function publicUser(user) {
  if (!user) return null;
  const { _testPassword, ...result } = user;
  return result;
}

export async function startSupabaseAuthStub({
  anonKey = TEST_SUPABASE_ANON_KEY,
  serviceRoleKey = TEST_SUPABASE_SERVICE_ROLE_KEY,
} = {}) {
  const users = new Map();
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const path = url.pathname;

    if (request.method === 'GET' && path === '/auth/v1/health') {
      sendJson(response, 200, { status: 'ok' });
      return;
    }

    const adminRoute = path.startsWith('/auth/v1/admin/users');
    const expectedKey = adminRoute ? serviceRoleKey : anonKey;
    if (request.headers.apikey !== expectedKey) {
      sendJson(response, 401, {
        code: 'invalid_api_key',
        message: 'Invalid test API key',
      });
      return;
    }

    let body;
    try {
      body = await readJson(request);
    } catch {
      sendJson(response, 400, {
        code: 'invalid_json',
        message: 'Invalid test request',
      });
      return;
    }

    if (
      adminRoute &&
      request.method === 'GET' &&
      path === '/auth/v1/admin/users'
    ) {
      sendJson(response, 200, {
        users: [...users.values()].map(publicUser),
        aud: 'authenticated',
      });
      return;
    }

    if (
      adminRoute &&
      request.method === 'POST' &&
      path === '/auth/v1/admin/users'
    ) {
      const email = typeof body.email === 'string' ? body.email : '';
      const password = typeof body.password === 'string' ? body.password : '';
      if (!email || !password) {
        sendJson(response, 400, {
          code: 'validation_failed',
          message: 'Email and password are required',
        });
        return;
      }
      if ([...users.values()].some((user) => user.email === email)) {
        sendJson(response, 422, {
          code: 'email_exists',
          message: 'User already registered',
        });
        return;
      }
      const user = makeUser({
        email,
        password,
        email_confirm: body.email_confirm,
      });
      users.set(user.id, user);
      sendJson(response, 200, { user: publicUser(user) });
      return;
    }

    const userId = path.startsWith('/auth/v1/admin/users/')
      ? decodeURIComponent(path.slice('/auth/v1/admin/users/'.length))
      : null;
    if (adminRoute && userId && request.method === 'PUT') {
      const user = users.get(userId);
      if (!user) {
        sendJson(response, 404, {
          code: 'user_not_found',
          message: 'User not found',
        });
        return;
      }
      if (typeof body.email === 'string') user.email = body.email;
      if (typeof body.password === 'string') user._testPassword = body.password;
      if (body.email_confirm === true) {
        user.email_confirmed_at = new Date().toISOString();
      }
      user.updated_at = new Date().toISOString();
      sendJson(response, 200, { user: publicUser(user) });
      return;
    }

    if (adminRoute && userId && request.method === 'DELETE') {
      users.delete(userId);
      sendJson(response, 200, { user: { id: userId } });
      return;
    }

    if (
      request.method === 'POST' &&
      path === '/auth/v1/token' &&
      url.searchParams.get('grant_type') === 'password'
    ) {
      const user = [...users.values()].find(
        (candidate) =>
          candidate.email === body.email &&
          candidate._testPassword === body.password,
      );
      if (!user) {
        sendJson(response, 400, {
          code: 'invalid_credentials',
          error_code: 'invalid_credentials',
          message: 'Invalid login credentials',
          msg: 'Invalid login credentials',
        });
        return;
      }
      const now = Math.floor(Date.now() / 1000);
      sendJson(response, 200, {
        access_token: `test.${randomUUID()}.access`,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: now + 3600,
        refresh_token: `test.${randomUUID()}.refresh`,
        user: publicUser(user),
      });
      return;
    }

    sendJson(response, 404, {
      code: 'not_found',
      message: 'Unsupported local Auth test route',
    });
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    await new Promise((resolve) => server.close(resolve));
    throw new Error('Unable to bind the local Supabase Auth stub.');
  }

  return {
    url: `http://127.0.0.1:${address.port}`,
    async close() {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      users.clear();
    },
  };
}
