import { describe, it, expect } from "vitest";
import { buildDynamicLauraPrompt, type EnabledFlow } from "../botFlowBlocks";

describe("buildDynamicLauraPrompt", () => {
  it("should assemble prompts in the correct order based on position", () => {
    const flows: EnabledFlow[] = [
      {
        flow_key: "salario_maternidade",
        label: "Salário Maternidade",
        icon_emoji: "🤰",
        position: 2,
        niche: "previdenciario",
      },
      {
        flow_key: "aposentadoria",
        label: "Aposentadoria",
        icon_emoji: "👴",
        position: 1,
        niche: "previdenciario",
      },
    ];

    const prompt = buildDynamicLauraPrompt({
      niche: "previdenciario",
      officeName: "Silva Advogados",
      enabledFlows: flows,
      offices: [],
    });

    // Check if Aposentadoria (position 1) comes before Salario Maternidade (position 2)
    const posAposentadoria = prompt.indexOf("APOSENTADORIA");
    const posMaternidade = prompt.indexOf("SALÁRIO-MATERNIDADE");

    expect(posAposentadoria).toBeGreaterThan(-1);
    expect(posMaternidade).toBeGreaterThan(-1);
    expect(posAposentadoria).toBeLessThan(posMaternidade);
  });

  it("should handle missing templates gracefully", () => {
    const flows: EnabledFlow[] = [
      {
        flow_key: "non_existent_key",
        label: "Fluxo Inexistente",
        icon_emoji: "❓",
        position: 1,
        niche: "previdenciario",
      },
    ];

    const prompt = buildDynamicLauraPrompt({
      niche: "previdenciario",
      enabledFlows: flows,
    });

    expect(prompt).toContain('ERRO: Fluxo "Fluxo Inexistente" não encontrado');
  });

  it("should include the correct Rule of Values text", () => {
    const prompt = buildDynamicLauraPrompt({
      niche: "previdenciario",
      enabledFlows: [],
    });

    expect(prompt).toContain("Essa nossa primeira conversa aqui para entender o seu problema e te orientar é totalmente gratuita");
    expect(prompt).toContain("Assuntos relacionados a valores de honorários devem ser tratados somente com os advogados");
    expect(prompt).toContain("Vamos agendar essa conversa?");
  });
});
