-- Designated admin emails: role is granted automatically at signup and applied
-- retroactively to existing accounts. No duplicate accounts are created.
CREATE TABLE IF NOT EXISTS public.admin_emails (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.admin_emails TO service_role;
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage admin emails" ON public.admin_emails
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.admin_emails (email) VALUES ('hk386579@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Apply to any existing matching account
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
JOIN public.admin_emails a ON lower(u.email) = a.email
ON CONFLICT (user_id, role) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email, NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer')
  ON CONFLICT DO NOTHING;

  IF EXISTS (SELECT 1 FROM public.admin_emails a WHERE a.email = lower(NEW.email)) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END; $function$;