-- Existing preview databases may still contain the historical zero-filled
-- foundation branch ID. Re-key only that known seeded branch; ON UPDATE CASCADE
-- preserves every device/session/history reference to it. If a branch has
-- already been created at the replacement ID, stop rather than merge records.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Branch"
    WHERE "id" = '00000000-0000-0000-0000-000000000002'
  ) AND EXISTS (
    SELECT 1
    FROM "Branch"
    WHERE "id" = '00000000-0000-4000-8000-000000000002'
  ) THEN
    RAISE EXCEPTION
      'Cannot reconcile the legacy seeded branch ID: the replacement branch ID already exists';
  END IF;
END $$;

UPDATE "Branch"
SET "id" = '00000000-0000-4000-8000-000000000002'
WHERE "id" = '00000000-0000-0000-0000-000000000002';

-- The old Phase 1 check required HMAC metadata for every ACTIVE device. Keep
-- that invariant for HMAC_LEGACY only; UNPAIRED and WEBAUTHN devices use their
-- own exclusive proof modes and must not require legacy HMAC secrets.
ALTER TABLE "Device"
  DROP CONSTRAINT "Device_active_attestation_secret_check";

ALTER TABLE "Device"
  ADD CONSTRAINT "Device_active_attestation_secret_check"
  CHECK (
    "authBindingMode" <> 'HMAC_LEGACY'
    OR "status" <> 'ACTIVE'
    OR (
      "attestationSecretCiphertext" IS NOT NULL
      AND "attestationSecretVersion" > 0
      AND "attestationSecretRotatedAt" IS NOT NULL
    )
  );
