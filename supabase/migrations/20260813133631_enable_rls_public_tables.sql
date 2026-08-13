-- Enable RLS on the public tables exposed through Supabase.
-- The backend uses direct Postgres access for application data, so no client policies are added here.

ALTER TABLE public."AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Branch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Card" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Device" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Receipt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
