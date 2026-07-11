
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS ocr_pending_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ocr_extracted_data jsonb,
  ADD COLUMN IF NOT EXISTS ocr_document_type text,
  ADD COLUMN IF NOT EXISTS ocr_review_token text,
  ADD COLUMN IF NOT EXISTS ocr_last_extracted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_leads_ocr_review_token ON public.leads(ocr_review_token) WHERE ocr_review_token IS NOT NULL;
