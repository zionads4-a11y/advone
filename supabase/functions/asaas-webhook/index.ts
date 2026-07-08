import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getErrorMessage } from "../_shared/errors.ts";
import { webhookCorsHeaders as corsHeaders } from "../_shared/cors.ts";
import { log } from "../_shared/logger.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const asaasToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
    if (!asaasToken) {
      log("error", "asaas-webhook", "ASAAS_WEBHOOK_TOKEN not configured — rejecting");
      return new Response("Service Unavailable", { status: 503, headers: corsHeaders });
    }
    const receivedToken = req.headers.get("asaas-access-token");
    if (receivedToken !== asaasToken) {
      log("warn", "asaas-webhook", "Unauthorized attempt");
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    log("info", "asaas-webhook", "Received webhook", { event: body.event });


    const { event, payment, subscription: subEvent } = body;
    const eventId = body.id || `${event}_${payment?.id || subEvent?.id}_${Date.now()}`;

    const { data: existing } = await adminClient
      .from("webhook_events")
      .select("id")
      .eq("event_id", eventId)
      .maybeSingle();

    if (existing) {
      log("info", "asaas-webhook", "Duplicate event skipped", { eventId });
      return new Response(JSON.stringify({ ok: true, duplicate: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await adminClient.from("webhook_events").insert({
      event_id: eventId,
      event_type: event,
      payload: body,
    });

    if (!event) {
      return new Response(JSON.stringify({ error: "Event missing" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    // Payment events — update subscription status based on payment
    if (event.startsWith("PAYMENT_")) {
      const subscriptionId = payment?.subscription;
      const paymentId = payment?.id;
      const externalReference = payment?.externalReference || "";

      // Handle monitoring package payment confirmation
      if (paymentId && (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED")) {
        const { data: monPkg } = await adminClient
          .from("monitoring_packages")
          .select("id, company_id, quantity, processes_per_package, status")
          .eq("asaas_payment_id", paymentId)
          .eq("status", "pending")
          .maybeSingle();

        if (monPkg) {
          console.log(`Activating monitoring package ${monPkg.id}`);
          
          // Update package status to active
          await adminClient
            .from("monitoring_packages")
            .update({ status: "active" })
            .eq("id", monPkg.id);

          // Calculate total processes from all active packages for this company
          const { data: allPackages } = await adminClient
            .from("monitoring_packages")
            .select("quantity, processes_per_package")
            .eq("company_id", monPkg.company_id)
            .eq("status", "active");

          const totalProcesses = (allPackages || []).reduce(
            (sum, p) => sum + p.quantity * p.processes_per_package, 0
          );

          // Upsert company_monitoring_plans
          const { data: existingPlan } = await adminClient
            .from("company_monitoring_plans")
            .select("id, max_processes")
            .eq("company_id", monPkg.company_id)
            .maybeSingle();

          if (existingPlan) {
            await adminClient
              .from("company_monitoring_plans")
              .update({
                max_processes: totalProcesses,
                is_active: true,
                plan_type: "pacote",
              })
              .eq("id", existingPlan.id);
          } else {
            await adminClient
              .from("company_monitoring_plans")
              .insert({
                company_id: monPkg.company_id,
                max_processes: totalProcesses,
                is_active: true,
                plan_type: "pacote",
              });
          }

          console.log(`Monitoring plan updated: ${totalProcesses} processes for company ${monPkg.company_id}`);
        }
      }

      // Handle meeting charges (faturamento por reunião)
      if (paymentId && (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED")) {
        const { data: charges } = await adminClient
          .from("meeting_charges")
          .select("id")
          .eq("asaas_payment_id", paymentId)
          .eq("status", "invoiced");
        if (charges && charges.length > 0) {
          await adminClient
            .from("meeting_charges")
            .update({ status: "paid", paid_at: new Date().toISOString() })
            .eq("asaas_payment_id", paymentId);
          console.log(`Meeting charges marked as paid: ${charges.length} (payment ${paymentId})`);
        }
      }

      // Handle monitoring package subscription payment (recurring)
      if (subscriptionId && (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED")) {
        const { data: monPkgSub } = await adminClient
          .from("monitoring_packages")
          .select("id, company_id, status")
          .eq("asaas_subscription_id", subscriptionId)
          .maybeSingle();

        if (monPkgSub && monPkgSub.status === "active") {
          console.log(`Recurring payment confirmed for monitoring package ${monPkgSub.id}`);
        }
      }

      // Handle monitoring package payment overdue/cancelled
      if (paymentId && (event === "PAYMENT_OVERDUE")) {
        await adminClient
          .from("monitoring_packages")
          .update({ status: "overdue" })
          .eq("asaas_payment_id", paymentId);
      }

      // Standard subscription handling
      if (subscriptionId) {
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
        // Update standard subscriptions
        const { error } = await adminClient
          .from("subscriptions")
          .update({ status: newStatus })
          .eq("asaas_subscription_id", subId);

        if (error) {
          console.error("Error updating subscription:", error);
        } else {
          console.log(`Subscription ${subId} updated to ${newStatus}`);
        }

        // Also check monitoring packages
        if (newStatus === "cancelled" || newStatus === "expired") {
          const { data: cancelledPkg } = await adminClient
            .from("monitoring_packages")
            .select("id, company_id")
            .eq("asaas_subscription_id", subId)
            .maybeSingle();

          if (cancelledPkg) {
            await adminClient
              .from("monitoring_packages")
              .update({ status: "cancelled" })
              .eq("id", cancelledPkg.id);

            // Recalculate total processes
            const { data: activePkgs } = await adminClient
              .from("monitoring_packages")
              .select("quantity, processes_per_package")
              .eq("company_id", cancelledPkg.company_id)
              .eq("status", "active");

            const totalProcesses = (activePkgs || []).reduce(
              (sum, p) => sum + p.quantity * p.processes_per_package, 0
            );

            if (totalProcesses === 0) {
              await adminClient
                .from("company_monitoring_plans")
                .update({ is_active: false, max_processes: 0 })
                .eq("company_id", cancelledPkg.company_id);
            } else {
              await adminClient
                .from("company_monitoring_plans")
                .update({ max_processes: totalProcesses })
                .eq("company_id", cancelledPkg.company_id);
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const msg = getErrorMessage(error, "Unknown error");
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
