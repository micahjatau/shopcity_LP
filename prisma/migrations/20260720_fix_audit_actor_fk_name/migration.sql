DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'AuditLog'
      AND c.conname = 'AuditLog_actor_fkey'
  ) THEN
    ALTER TABLE "AuditLog"
      RENAME CONSTRAINT "AuditLog_actor_fkey" TO "AuditLog_actorTenantId_actorId_fkey";
  END IF;
END $$;
