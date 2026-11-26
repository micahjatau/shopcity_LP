-- Restore the canonical immutable helper referenced by the enabled
-- CreditLot lifecycle triggers. The body matches the original migration
-- 20260725_sprint_2_financial_integrity_lifecycle_closure exactly.
CREATE OR REPLACE FUNCTION public.derive_credit_lot_expires_at(earned_at TIMESTAMP(3))
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
