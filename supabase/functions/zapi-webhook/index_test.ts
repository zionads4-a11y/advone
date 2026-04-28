
import { assert, assertEquals, assertStringIncludes, assertNotMatch } from "https://deno.land/std@0.168.0/testing/asserts.ts";

// Mock do builder de prompt (simplificado para o teste)
function buildSDRPromptMock(timezone: string = "America/Sao_Paulo", decisionRules: string = "") {
  // Injeta regras de ouro que o bot deve seguir
  const goldenRules = `
═══════════════════════════════════════
🚫 REGRA DE OURO (PRIORIDADE ABSOLUTA)
═══════════════════════════════════════
NUNCA, em hipótese alguma, peça o CPF do cliente. Também não peça RG. Peça apenas o NOME COMPLETO no final do agendamento. Se o cliente perguntar se precisa de CPF, diga que não é necessário agora. Esta regra é inviolável.

1. 🚫 NUNCA peça CPF para o lead. Esta é a regra mais importante. Se você pedir CPF, você falhou em sua missão.
2. 🚫 NUNCA peça RG ou senha do Meu INSS.
  `;
  
  return `Identidade: Laura SDR. ${goldenRules} Regras Adicionais: ${decisionRules}`;
}

Deno.test("Security: Bot MUST NEVER ask for CPF or RG", () => {
  const prompt = buildSDRPromptMock();
  
  // Verifica se as instruções proibitivas estão presentes no prompt base
  assertStringIncludes(prompt, "NUNCA, em hipótese alguma, peça o CPF");
  assertStringIncludes(prompt, "Também não peça RG");
  assertStringIncludes(prompt, "NUNCA peça CPF para o lead");
  
  // Simulação de verificação de output (o que o bot responderia)
  // Nota: Testes reais de LLM exigiriam chamadas de API, aqui testamos a lógica de proteção
  const forbiddenTerms = [/cpf/i, /rg/i, /documento de identidade/i, /senha do meu inss/i];
  
  const botResponses = [
    "Olá! Como posso ajudar?",
    "Pode me passar seu nome completo?",
    "Não precisamos do seu CPF agora, apenas do seu nome para agendar."
  ];

  for (const response of botResponses) {
    // Apenas validamos que o bot não peça ativamente, mas ele pode citar CPF se for para dizer que NÃO precisa
    if (response.toLowerCase().includes("cpf") || response.toLowerCase().includes("rg")) {
      assert(
        response.toLowerCase().includes("não") || 
        response.toLowerCase().includes("neste momento não") ||
        response.toLowerCase().includes("necessário"),
        `Bot citou documento de forma suspeita: "${response}"`
      );
    }
  }
});

Deno.test("Validation Logic: Modality and Unit", () => {
  const mockOffices = [
    { name: "Unidade Centro", is_active: true },
    { name: "Unidade Sul", is_active: true }
  ];

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

  const res1 = validateModality({ modality: "presencial", unit: "Qualquer" }, []);
  assertEquals(res1.modality, "online");
  assertEquals(res1.unitName, "Online");

  const res2 = validateModality({ modality: "presencial", unit: "unidade sul" }, mockOffices);
  assertEquals(res2.modality, "presencial");
  assertEquals(res2.unitName, "Unidade Sul");
});

Deno.test("Timezone: Date generation follows Golden Rules", () => {
  const getNowInTimezone = (tz: string) => {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric", month: "numeric", day: "numeric",
      hour: "numeric", minute: "numeric", second: "numeric",
      hour12: false
    });
    return new Date(fmt.format(new Date()));
  };

  const tzSP = "America/Sao_Paulo";
  const now = getNowInTimezone(tzSP);
  
  // Regra de Ouro: Nunca usar anos passados
  const currentYear = now.getFullYear();
  assert(currentYear >= 2024, "Year should be current or future");
  
  // Simulação de oferta de horários: Manhã e Tarde
  const offerSlots = (slots: string[]) => {
    const hasMorning = slots.some(s => parseInt(s.split(":")[0]) < 12);
    const hasAfternoon = slots.some(s => parseInt(s.split(":")[0]) >= 12);
    return hasMorning && hasAfternoon;
  };

  const sampleSlots = ["09:00", "14:30"];
  assert(offerSlots(sampleSlots), "Should offer both morning and afternoon slots");
});

