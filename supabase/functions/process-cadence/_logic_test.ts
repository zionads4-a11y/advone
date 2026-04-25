import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  CADENCE_MESSAGES,
  INACTIVITY_NUDGES,
  MAX_CADENCE_ATTEMPTS,
  renderCadenceMessage,
  selectInactivityNudge,
  nextCadenceDelayMs,
} from "./_logic.ts";

Deno.test("MAX_CADENCE_ATTEMPTS is 5", () => {
  assertEquals(MAX_CADENCE_ATTEMPTS, 5);
});

Deno.test("CADENCE_MESSAGES has all 5 attempts defined", () => {
  for (let i = 1; i <= 5; i++) {
    assertExists(CADENCE_MESSAGES[i], `attempt ${i} is missing`);
    assertEquals(CADENCE_MESSAGES[i].includes("{nome}"), true);
  }
});

Deno.test("renderCadenceMessage replaces {nome} with first name", () => {
  const msg = renderCadenceMessage(1, "Maria Silva");
  assertEquals(msg.includes("Maria"), true);
  assertEquals(msg.includes("{nome}"), false);
});

Deno.test("renderCadenceMessage uses fallback for empty name", () => {
  const msg = renderCadenceMessage(1, "");
  assertEquals(msg.includes("{nome}"), false);
  assertEquals(msg.length > 0, true);
});

Deno.test("renderCadenceMessage returns empty for invalid day", () => {
  assertEquals(renderCadenceMessage(99, "Maria"), "");
});

Deno.test("INACTIVITY_NUDGES has 4 thresholds (30/90/150/180)", () => {
  assertEquals(INACTIVITY_NUDGES.length, 4);
  assertEquals(INACTIVITY_NUDGES.map((n) => n.minutesAfter), [30, 90, 150, 180]);
});

Deno.test("selectInactivityNudge: returns null below first threshold", () => {
  assertEquals(selectInactivityNudge(15), null);
  assertEquals(selectInactivityNudge(29), null);
});

Deno.test("selectInactivityNudge: picks 30min nudge between 30-89min", () => {
  const n = selectInactivityNudge(45);
  assertExists(n);
  assertEquals(n!.minutesAfter, 30);
});

Deno.test("selectInactivityNudge: picks 90min nudge at 90min", () => {
  const n = selectInactivityNudge(90);
  assertEquals(n!.minutesAfter, 90);
});

Deno.test("selectInactivityNudge: picks highest applicable threshold", () => {
  assertEquals(selectInactivityNudge(200)!.minutesAfter, 180);
  assertEquals(selectInactivityNudge(160)!.minutesAfter, 150);
});

Deno.test("nextCadenceDelayMs: first attempt = 10 min", () => {
  assertEquals(nextCadenceDelayMs(0), 10 * 60 * 1000);
});

Deno.test("nextCadenceDelayMs: subsequent attempts = 1 day", () => {
  assertEquals(nextCadenceDelayMs(1), 24 * 60 * 60 * 1000);
  assertEquals(nextCadenceDelayMs(4), 24 * 60 * 60 * 1000);
});

Deno.test("nextCadenceDelayMs: returns null after MAX_CADENCE_ATTEMPTS", () => {
  assertEquals(nextCadenceDelayMs(5), null);
});

Deno.test("Cadence tone escalates: msg 4 is most direct", () => {
  // Validate tone progression: msg 4 should NOT have the "🙂" softener
  // (it uses period instead) — guards against accidental rewrites
  assertEquals(CADENCE_MESSAGES[4].startsWith("Oi, {nome}.\n\n"), true);
  assertEquals(CADENCE_MESSAGES[4].includes("bem direto"), true);
});

Deno.test("Cadence msg 5 closes the loop without pushing", () => {
  assertEquals(CADENCE_MESSAGES[5].includes("encerrar"), true);
  assertEquals(CADENCE_MESSAGES[5].includes("disposição"), true);
});
