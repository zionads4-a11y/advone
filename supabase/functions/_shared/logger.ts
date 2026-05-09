export function log(level: "info" | "warn" | "error", fn: string, msg: string, data?: Record<string, unknown>) {
  const entry = { level, fn, msg, ts: new Date().toISOString(), ...data };
  if (level === "error") console.error(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}
