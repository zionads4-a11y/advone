
import { assert, assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

// Mock para testes básicos de lógica
Deno.test("Validation Logic: Modality and Unit", () => {
  const mockOffices = [
    { name: "Unidade Centro", is_active: true },
    { name: "Unidade Sul", is_active: true }
  ];

  // Simulando a lógica que implementamos no webhook
  const validateModality = (args: any, companyOffices: any[]) => {
    let modality = args.modality || "online";
    let unitName = args.unit || "";
    const activeOfficesList = companyOffices || [];
    const hasOffices = activeOfficesList.length > 0;

    if (!hasOffices) {
      modality = "online";
      unitName = "Online";
    } else if (modality === "presencial") {
      const matchedOffice = activeOfficesList.find((o: any) => o.name.toLowerCase().trim() === unitName.toLowerCase().trim());
      if (matchedOffice) {
        unitName = matchedOffice.name;
      } else {
        unitName = activeOfficesList[0].name;
      }
    } else {
      modality = "online";
      unitName = "Online";
    }
    return { modality, unitName };
  };

  // Teste 1: Sem unidades
  const res1 = validateModality({ modality: "presencial", unit: "Qualquer" }, []);
  assertEquals(res1.modality, "online");
  assertEquals(res1.unitName, "Online");

  // Teste 2: Unidade válida
  const res2 = validateModality({ modality: "presencial", unit: "unidade sul" }, mockOffices);
  assertEquals(res2.modality, "presencial");
  assertEquals(res2.unitName, "Unidade Sul");

  // Teste 3: Unidade inválida (alucinação) -> deve cair na primeira
  const res3 = validateModality({ modality: "presencial", unit: "Endereço Inventado" }, mockOffices);
  assertEquals(res3.modality, "presencial");
  assertEquals(res3.unitName, "Unidade Centro");

  // Teste 4: Online deve limpar unit
  const res4 = validateModality({ modality: "online", unit: "Unidade Centro" }, mockOffices);
  assertEquals(res4.modality, "online");
  assertEquals(res4.unitName, "Online");
});

Deno.test("Debug Mode Flag Logic", () => {
  const config = { debug_mode: true };
  let logCalled = false;
  
  const logDebug = (cfg: any) => {
    if (cfg?.debug_mode) {
      logCalled = true;
    }
  };

  logDebug(config);
  assert(logCalled, "Log should be called when debug_mode is true");

  logCalled = false;
  logDebug({ debug_mode: false });
  assert(!logCalled, "Log should NOT be called when debug_mode is false");
});
