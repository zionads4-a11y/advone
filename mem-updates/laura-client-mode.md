---
name: Laura Client Mode Decisions
description: Decisões de produto para Laura atendendo clientes existentes (modo compartilhado)
type: feature
---

# Laura — atendimento a clientes existentes

- **Identificação**: sempre nome completo + CPF (não usa só nome para evitar ambiguidade).
- **Advogado solicitado**: se cliente pede Dr. X, Laura chama Dr. X mesmo que não seja o responsável pelo processo. Nunca recusa transferência.
- **Status de processo**:
  - Monitorado → Laura responde última movimentação em linguagem natural.
  - Não monitorado → Laura informa horário de atendimento e encaminha p/ humano.
- **Recepção**: advogado atende **dentro do AdvOne** (não WhatsApp pessoal). Cada área/setor tem sub-aba separada em "Conversas de Clientes".
- **Armazenamento**:
  - Tabela `client_conversations` separada de `leads` (não polui métricas de conversão).
  - Append-only: sem UPDATE, sem DELETE (nem admin apaga). Trigger bloqueia.
  - Botão "Baixar conversa completa" (PDF/TXT). Apenas "Arquivar", nunca deletar.
