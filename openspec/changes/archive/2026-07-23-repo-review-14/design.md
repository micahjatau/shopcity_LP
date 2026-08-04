## Context

The review shows the current SMS path is close but still unsafe for production: the worker can bypass the SMS provider factory, environment validation can reject valid provider modes, and a retrying BullMQ job can continue after the database has already dead-lettered the message.

## Goals / Non-Goals

**Goals:**

- Make production SMS provider selection explicit and environment-driven.
- Ensure valid provider modes are accepted by config validation.
- Stop delivery attempts after dead-lettering or retry exhaustion.
- Keep retries replay-safe so provider side effects do not duplicate.

**Non-Goals:**

- Change the SMS vendor integration contract beyond what is needed for safety.
- Rework unrelated worker scheduling or queue topology.
- Modify product behavior outside the SMS delivery path.

## Decisions

- Require the worker entrypoint to use the provider factory in production.
- Align the environment schema with the provider factory modes.
- Treat dead-letter and exhausted-retry state as terminal before any provider call.
- Prefer idempotent/replay-safe provider semantics over unconditional resend behavior.

## Risks / Trade-offs

- More explicit config validation may reject previously tolerated but invalid deployments.
- Retrying logic becomes stricter, which is desirable for safety but may expose hidden queue assumptions.
- Provider idempotency may require additional integration behavior in later implementation work.

## Migration Plan

1. Update the spec to require factory-based provider selection and valid env modes.
2. Add terminal-state retry requirements for dead-lettered SMS messages.
3. Add replay-safety requirements for provider side effects.
4. Add tests and verification notes when implementation begins.
