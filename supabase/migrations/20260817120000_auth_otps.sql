-- Email OTP codes for login and signup (verified server-side, 5-minute expiry)
CREATE TABLE IF NOT EXISTS public.auth_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  otp_hash text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('login', 'signup')),
  metadata jsonb NOT NULL DEFAULT '{}',
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_otps_email_purpose_idx ON public.auth_otps (lower(email), purpose);
CREATE INDEX IF NOT EXISTS auth_otps_expires_idx ON public.auth_otps (expires_at);

-- Service role only — never expose OTP rows to clients
GRANT ALL ON public.auth_otps TO service_role;
ALTER TABLE public.auth_otps ENABLE ROW LEVEL SECURITY;
