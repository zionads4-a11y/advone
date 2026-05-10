import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const ALLOWED_PATTERNS = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https:\/\/.*\.lovable\.app$/,
  /^https:\/\/.*\.lovable\.dev$/,
  /^https:\/\/.*\.lovableproject\.com$/,
  /^https:\/\/(www\.)?advone\.online$/,
  /^https:\/\/advone\.lovable\.app$/,
];

export function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const isAllowed = ALLOWED_PATTERNS.some((p) => p.test(origin));
  const allowedOrigin = isAllowed ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Expose-Headers": "x-conversation-id, X-Conversation-Id",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };
}

export const webhookCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token, x-webhook-secret",
};
