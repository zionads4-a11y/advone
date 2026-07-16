REVOKE EXECUTE ON FUNCTION public.notify_lawyer_on_assignment() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.notify_user_on_mention() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_can_see_lead(uuid, uuid) FROM PUBLIC, anon;