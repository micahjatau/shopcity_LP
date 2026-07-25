CREATE OR REPLACE FUNCTION derive_credit_lot_expires_at(earned_at TIMESTAMP(3))
RETURNS TIMESTAMP(3) AS $$
DECLARE
  target_year INTEGER;
  target_month INTEGER;
  target_day INTEGER;
  last_day_of_target_month INTEGER;
BEGIN
  target_year := EXTRACT(YEAR FROM earned_at)::INTEGER + 1;
  target_month := EXTRACT(MONTH FROM earned_at)::INTEGER;

  SELECT EXTRACT(DAY FROM (date_trunc('month', make_date(target_year, target_month, 1)) + INTERVAL '1 month - 1 day'))::INTEGER
  INTO last_day_of_target_month;

  target_day := LEAST(EXTRACT(DAY FROM earned_at)::INTEGER, last_day_of_target_month);

  RETURN make_timestamp(
    target_year,
    target_month,
    target_day,
    EXTRACT(HOUR FROM earned_at)::INTEGER,
    EXTRACT(MINUTE FROM earned_at)::INTEGER,
    EXTRACT(SECOND FROM earned_at)
  )::TIMESTAMP(3);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "CreditLot"
    WHERE "expiresAt" IS DISTINCT FROM derive_credit_lot_expires_at("earnedAt")
  ) THEN
    RAISE EXCEPTION 'Credit lot expiries must match the twelve-month derived expiry before applying lifecycle closure';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "CreditLot"
    WHERE "remainingAmountKobo" < 0
       OR "remainingAmountKobo" > "originalAmountKobo"
  ) THEN
    RAISE EXCEPTION 'Credit lot remaining balances must be between zero and original amount before applying lifecycle closure';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION validate_credit_lot_lifecycle()
RETURNS trigger AS $$
BEGIN
  IF NEW."expiresAt" IS DISTINCT FROM derive_credit_lot_expires_at(NEW."earnedAt") THEN
    RAISE EXCEPTION 'credit lot expiry must be derived from earned timestamp';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD."expiresAt" IS DISTINCT FROM NEW."expiresAt" THEN
      RAISE EXCEPTION 'credit lot expiry is immutable';
    END IF;

    IF OLD."remainingAmountKobo" IS DISTINCT FROM NEW."remainingAmountKobo" THEN
      RAISE EXCEPTION 'credit lot remaining balance is temporarily immutable';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "validate_credit_lot_lifecycle_insert"
BEFORE INSERT ON "CreditLot"
FOR EACH ROW
EXECUTE FUNCTION validate_credit_lot_lifecycle();

CREATE TRIGGER "validate_credit_lot_lifecycle_update"
BEFORE UPDATE ON "CreditLot"
FOR EACH ROW
EXECUTE FUNCTION validate_credit_lot_lifecycle();

CREATE OR REPLACE FUNCTION prevent_credit_lot_delete()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'credit lots cannot be deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "prevent_credit_lot_delete"
BEFORE DELETE ON "CreditLot"
FOR EACH ROW
EXECUTE FUNCTION prevent_credit_lot_delete();
