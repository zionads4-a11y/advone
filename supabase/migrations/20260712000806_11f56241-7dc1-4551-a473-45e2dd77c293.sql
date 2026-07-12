
-- Add health tracking fields to process_cards
ALTER TABLE public.process_cards
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_activity_type TEXT,
  ADD COLUMN IF NOT EXISTS weekly_target INTEGER NOT NULL DEFAULT 1;

-- Backfill from existing data
UPDATE public.process_cards
SET last_activity_at = COALESCE(last_movement_at, updated_at, created_at)
WHERE last_activity_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_process_cards_last_activity
  ON public.process_cards(company_id, last_activity_at);

-- Trigger: whenever an activity is inserted, bump the card's last_activity_at
CREATE OR REPLACE FUNCTION public.bump_process_card_last_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.process_cards
     SET last_activity_at = NEW.created_at,
         last_activity_type = NEW.activity_type
   WHERE id = NEW.card_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_card_last_activity ON public.process_card_activity;
CREATE TRIGGER trg_bump_card_last_activity
AFTER INSERT ON public.process_card_activity
FOR EACH ROW EXECUTE FUNCTION public.bump_process_card_last_activity();

-- Helper function: how many activities this card had in the current week (Mon-Sun, BRT)
CREATE OR REPLACE FUNCTION public.process_card_weekly_activity_count(_card_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
    FROM public.process_card_activity
   WHERE card_id = _card_id
     AND created_at >= date_trunc('week', (now() AT TIME ZONE 'America/Sao_Paulo'))
                       AT TIME ZONE 'America/Sao_Paulo';
$$;
