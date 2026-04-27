-- Update handle_user_login to include a fixed search_path
CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the profiles table when auth.users.last_sign_in_at changes
  IF (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at) THEN
    UPDATE public.profiles
    SET last_login = NEW.last_sign_in_at
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
