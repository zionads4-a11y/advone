-- Add last_login column to profiles
ALTER TABLE public.profiles ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;

-- Create function to handle user login updates
CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the profiles table when auth.users.last_sign_in_at changes
  -- We check if it's a login event (last_sign_in_at changed)
  IF (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at) THEN
    UPDATE public.profiles
    SET last_login = NEW.last_sign_in_at
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
-- Note: We need to use a trigger on auth.users which is in the auth schema.
-- This requires permissions that are usually available in Lovable migrations.
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_login();
