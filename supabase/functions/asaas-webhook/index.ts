import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    console.log("Asaas webhook received:", JSON.stringify(body));

    const { event, payment, subscription: subEvent } = body;

    if (!event) {
      return new Response(JSON.stringify({ error: "Event missing" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Payment events — update subscription status based on payment
    if (event.startsWith("PAYMENT_")) {
      const subscriptionId = payment?.subscription;

      if (!subscriptionId) {
        console.log("Payment without subscription, skipping");
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let newStatus: string | null = null;

      switch (event) {
        case "PAYMENT_CONFIRMED":
        case "PAYMENT_RECEIVED":
          newStatus = "active";
          break;
        case "PAYMENT_OVERDUE":
          newStatus = "overdue";
          break;
        case "PAYMENT_REFUNDED":
        case "PAYMENT_CHARGEBACK_REQUESTED":
          newStatus = "refunded";
          break;
        case "PAYMENT_DELETED":
        case "PAYMENT_RESTORED":
          // No status change
          break;
        default:
          console.log("Unhandled payment event:", event);
          break;
      }

      if (newStatus) {
        const { error } = await adminClient
          .from("subscriptions")
          .update({ status: newStatus })
          .eq("asaas_subscription_id", subscriptionId);

        if (error) {
          console.error("Error updating subscription from payment:", error);
        } else {
          console.log(`Subscription ${subscriptionId} updated to ${newStatus}`);
        }
      }
    }

    // Subscription events
    if (event.startsWith("SUBSCRIPTION_")) {
      const subId = subEvent?.id || body?.id;

      if (!subId) {
        console.log("Subscription event without ID, skipping");
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let newStatus: string | null = null;

      switch (event) {
        case "SUBSCRIPTION_CREATED":
        case "SUBSCRIPTION_RENEWED":
        case "SUBSCRIPTION_REACTIVATED":
          newStatus = "active";
          break;
        case "SUBSCRIPTION_CANCELLED":
        case "SUBSCRIPTION_DELETED":
          newStatus = "cancelled";
          break;
        case "SUBSCRIPTION_EXPIRED":
          newStatus = "expired";
          break;
        case "SUBSCRIPTION_OVERDUE":
          newStatus = "overdue";
          break;
        default:
          console.log("Unhandled subscription event:", event);
          break;
      }

      if (newStatus) {
        const { error } = await adminClient
          .from("subscriptions")
          .update({ status: newStatus })
          .eq("asaas_subscription_id", subId);

        if (error) {
          console.error("Error updating subscription:", error);
        } else {
          console.log(`Subscription ${subId} updated to ${newStatus}`);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
