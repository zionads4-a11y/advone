-- Tighten realtime topic policy to avoid substring spoofing
DROP POLICY IF EXISTS "Realtime company scoped" ON realtime.messages;

CREATE POLICY "Realtime company scoped"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM client_companies cc
    WHERE cc.user_id = auth.uid()
      AND realtime.topic() ~ ('(^|[-:_/])' || cc.company_id::text || '($|[-:_/])')
  )
);