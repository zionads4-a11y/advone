-- Update handle_user_login to specifically check for Google provider
CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the profiles table when auth.users.last_sign_in_at changes
  -- AND the provider is 'google'
  IF (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at AND NEW.raw_app_meta_data->>'provider' = 'google') THEN
    UPDATE public.profiles
    SET last_login = NEW.last_sign_in_at
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
