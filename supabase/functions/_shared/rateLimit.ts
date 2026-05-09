export async function checkRateLimit(
  adminClient: any,
  userId: string,
  action: string,
  maxPerHour: number
): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

  const { count, error } = await adminClient
    .from("rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", action)
    .gte("created_at", oneHourAgo);

  if (error) {
    console.error("Rate limit check error:", error);
    return true; // Failsafe: allow if DB error
  }

  if ((count || 0) >= maxPerHour) return false;

  await adminClient.from("rate_limits").insert({
    user_id: userId,
    action,
  });

  return true;
}
