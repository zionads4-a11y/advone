import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  REMINDER_WINDOWS,
  selectReminderWindow,
  formatDateBR,
  formatTimeBR,
} from "./_logic.ts";

Deno.test("REMINDER_WINDOWS has 3 windows in correct order", () => {
  assertEquals(REMINDER_WINDOWS.length, 3);
  assertEquals(REMINDER_WINDOWS[0].column, "reminder_6h_sent");
  assertEquals(REMINDER_WINDOWS[1].column, "reminder_2h_sent");
  assertEquals(REMINDER_WINDOWS[2].column, "reminder_30m_sent");
});

Deno.test("5h window: matches when due 5h ahead and not yet sent", () => {
  const now = new Date("2025-01-01T10:00:00Z");
  const due = new Date("2025-01-01T15:00:00Z"); // 5h
  const w = selectReminderWindow(now, due, {});
  assertExists(w);
  assertEquals(w!.column, "reminder_6h_sent");
});

Deno.test("1h window: matches when due 1h ahead", () => {
  const now = new Date("2025-01-01T10:00:00Z");
  const due = new Date("2025-01-01T11:00:00Z"); // 1h
  const w = selectReminderWindow(now, due, {});
  assertExists(w);
  assertEquals(w!.column, "reminder_2h_sent");
});

Deno.test("30m window: matches when due 30min ahead", () => {
  const now = new Date("2025-01-01T10:00:00Z");
  const due = new Date("2025-01-01T10:30:00Z"); // 0.5h
  const w = selectReminderWindow(now, due, {});
  assertExists(w);
  assertEquals(w!.column, "reminder_30m_sent");
});

Deno.test("returns null if reminder already sent", () => {
  const now = new Date("2025-01-01T10:00:00Z");
  const due = new Date("2025-01-01T15:00:00Z");
  const w = selectReminderWindow(now, due, { reminder_6h_sent: true });
  assertEquals(w, null);
});

Deno.test("returns null if outside any window", () => {
  const now = new Date("2025-01-01T10:00:00Z");
  const due = new Date("2025-01-01T13:00:00Z"); // 3h - between windows
  const w = selectReminderWindow(now, due, {});
  assertEquals(w, null);
});

Deno.test("returns null for past meetings", () => {
  const now = new Date("2025-01-01T10:00:00Z");
  const due = new Date("2025-01-01T09:00:00Z");
  const w = selectReminderWindow(now, due, {});
  assertEquals(w, null);
});

Deno.test("5h message contains key psychological triggers (reciprocity)", () => {
  const msg = REMINDER_WINDOWS[0].getMessage("Maria", "segunda-feira, 01/01", "15:00");
  assertEquals(msg.includes("Maria"), true);
  assertEquals(msg.includes("já foi informado"), true);
  assertEquals(msg.includes("15:00"), true);
});

Deno.test("1h message asks for active confirmation", () => {
  const msg = REMINDER_WINDOWS[1].getMessage("João", "", "11:00");
  assertEquals(msg.includes("1 hora"), true);
  assertEquals(msg.includes("vou estar pronto"), true);
  assertEquals(msg.includes("documentos"), true);
});

Deno.test("30m message conveys imminence", () => {
  const msg = REMINDER_WINDOWS[2].getMessage("Ana", "", "10:30");
  assertEquals(msg.includes("AGORA"), true);
  assertEquals(msg.includes("25 minutos"), true);
  assertEquals(msg.includes("10:30"), true);
});

Deno.test("formatDateBR/formatTimeBR produce expected formats", () => {
  const d = new Date("2025-01-06T14:05:00Z"); // monday
  assertEquals(formatDateBR(d), "segunda-feira, 06/01");
  assertEquals(formatTimeBR(d), "14:05");
});
