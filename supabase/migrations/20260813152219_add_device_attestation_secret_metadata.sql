alter table public."Device"
  add column if not exists "attestationSecretVersion" integer not null default 0,
  add column if not exists "attestationSecretRotatedAt" timestamp(3);
