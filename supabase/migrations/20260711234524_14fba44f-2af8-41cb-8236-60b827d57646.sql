-- Cleanup any orphan process data and enforce 1 funnel per legal area
DELETE FROM public.process_cards;
DELETE FROM public.process_board_columns;
DELETE FROM public.process_boards;

-- 1 board por área jurídica por empresa
ALTER TABLE public.process_boards
  ADD CONSTRAINT process_boards_one_per_area UNIQUE (company_id, legal_area_id);