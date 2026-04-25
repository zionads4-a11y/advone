/**
 * Safely extracts a human-readable message from an unknown error.
 * Use in catch blocks to avoid TS18046 ('e' is of type 'unknown').
 *
 * @example
 *   try { ... } catch (e) {
 *     console.error("Failed:", getErrorMessage(e));
 *   }
 */
export function getErrorMessage(error: unknown, fallback = "Erro desconhecido"): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message: unknown }).message;
    if (typeof msg === "string") return msg;
  }
  try {
    return JSON.stringify(error) || fallback;
  } catch {
    return fallback;
  }
}
