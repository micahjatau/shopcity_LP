# Prefer Upstash REST Redis in serverless deployments

## Why

Vercel production health checks report Redis TCP sockets closing unexpectedly. The Redis client currently gives a non-local `REDIS_URL` precedence over available Upstash REST credentials, forcing serverless functions onto a persistent TCP path.

## What Changes

- Prefer supported Upstash REST credentials whenever they are configured.
- Retain `REDIS_URL` as a fallback for environments without REST credentials.
- Add regression coverage for provider selection.

## Non-Goals

- Changing Redis data structures or commands.
- Changing Vercel environment values or exposing credentials.
- Removing TCP Redis support for workers or non-serverless environments.

## Impact

The Redis client provider-selection behavior and its unit tests change. Production and staging still require valid Upstash REST environment variables to be configured separately.
