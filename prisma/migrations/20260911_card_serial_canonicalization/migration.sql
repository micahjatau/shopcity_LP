DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Card"
    WHERE length(trim("barcodeValue")) = 0
       OR length(trim("barcodeValue")) > 64
       OR upper(trim("barcodeValue")) !~ '^[A-Z0-9][A-Z0-9-]*$'
  ) THEN
    RAISE EXCEPTION
      'Card serial canonicalization blocked: invalid serial values exist; resolve them with the card migration runbook first';
  END IF;

  IF EXISTS (
    SELECT "tenantId", upper(trim("barcodeValue"))
    FROM "Card"
    GROUP BY "tenantId", upper(trim("barcodeValue"))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Card serial canonicalization blocked: canonical collisions exist; resolve them with the card migration runbook first';
  END IF;
END $$;

UPDATE "Card"
SET "barcodeValue" = upper(trim("barcodeValue"))
WHERE "barcodeValue" <> upper(trim("barcodeValue"));
