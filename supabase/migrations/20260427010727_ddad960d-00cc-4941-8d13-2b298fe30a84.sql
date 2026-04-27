-- Update existing profiles with emails from auth.users where they are missing
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id AND p.email IS NULL;

-- Ensure no null emails before setting NOT NULL constraint
-- If some users still don't have emails (unlikely given the join), we set a placeholder
UPDATE public.profiles SET email = 'placeholder@example.com' WHERE email IS NULL;

-- Add NOT NULL constraint to email
ALTER TABLE public.profiles ALTER COLUMN email SET NOT NULL;

-- Function to normalize email (lowercase and trim)
CREATE OR REPLACE FUNCTION public.normalize_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    NEW.email = LOWER(TRIM(NEW.email));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for email normalization
DROP TRIGGER IF EXISTS tr_normalize_profile_email ON public.profiles;
CREATE TRIGGER tr_normalize_profile_email
BEFORE INSERT OR UPDATE OF email ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.normalize_profile_email();

-- Update handle_new_user function to include email and normalize it
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    LOWER(TRIM(NEW.email))
  );
  
  -- First user gets admin role, rest get member
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;