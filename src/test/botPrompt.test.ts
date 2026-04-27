import { describe, it, expect } from "vitest";
import { buildDynamicLauraPrompt, getFlowBlock } from "../components/companies/botFlowBlocks";

describe("Bot Prompt Generation", () => {
  const mockFlows = [
    {
      flow_key: "salario_maternidade",
      label: "Salário Maternidade",
      icon_emoji: "🤰",
      position: 1,
      niche: "previdenciario" as const,
    },
    {
      flow_key: "beneficio_negado",
      label: "Benefício Negado",
      icon_emoji: "❌",
      position: 2,
      niche: "previdenciario" as const,
    }
  ];

  it("should include specific flow prompt for each enabled case_type", () => {
    const prompt = buildDynamicLauraPrompt({
      niche: "previdenciario",
      officeName: "Teste Advogados",
      enabledFlows: mockFlows,
    });

    // Valida se o título e o case_type de cada fluxo estão presentes
    expect(prompt).toContain("SALÁRIO-MATERNIDADE (case_type: salario_maternidade)");
    expect(prompt).toContain("BENEFÍCIO NEGADO (case_type: beneficio_negado)");
    
    // Valida se as perguntas específicas do fluxo foram incluídas
    expect(prompt).toContain("P1 situacao:");
    expect(prompt).toContain("P1 benefit_type:");
  });

  it("should handle the 'valores' rule correctly in the generated prompt", () => {
    const prompt = buildDynamicLauraPrompt({
      niche: "previdenciario",
      enabledFlows: [],
    });

    expect(prompt).toContain("💰 REGRA DE VALORES E CONSULTA");
    expect(prompt).toContain("totalmente gratuita");
    expect(prompt).toContain("quanto vai ficar");
    expect(prompt).toContain("qual o valor");
  });

  it("should enforce 'online only' message when no offices are provided", () => {
    const prompt = buildDynamicLauraPrompt({
      niche: "previdenciario",
      enabledFlows: [],
      offices: []
    });

    expect(prompt).toContain("REGRA CRÍTICA");
    expect(prompt).toContain("NÃO possui endereço cadastrado");
    expect(prompt).toContain("100% ONLINE");
  });
});
