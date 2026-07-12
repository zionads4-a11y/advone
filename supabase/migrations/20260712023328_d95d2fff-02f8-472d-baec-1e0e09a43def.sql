CREATE OR REPLACE FUNCTION public.block_client_msg_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  RAISE EXCEPTION 'Mensagens de conversas de clientes são somente-leitura (append-only).';
END;
$function$;