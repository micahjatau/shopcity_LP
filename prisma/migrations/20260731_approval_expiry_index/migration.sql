CREATE INDEX "Approval_status_expiresAt_requestedAt_id_idx"
  ON "Approval" ("status", "expiresAt", "requestedAt", "id");
