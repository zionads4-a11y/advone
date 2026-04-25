---
name: IA Jurídica (Premium)
description: Página /ia-juridica com chat streaming + templates (petição, MS, contrato, recurso) usando Lovable AI (Gemini 2.5 Pro). Bloqueada para partnership_type='exito', liberada apenas para 'mensalidade_zionads' via função SQL company_has_legal_ai_access. Tabelas legal_ai_conversations e legal_ai_messages com RLS. Edge function legal-ai-chat (verify_jwt=false, valida em código). Export .docx via biblioteca docx.
type: feature
---
- Acesso: somente empresas `mensalidade_zionads` + admins. Êxito é bloqueado por RLS + check no edge.
- Persona: "Dra. Helena Vasconcellos", advogada sênior 30+ anos, doutora.
- Modelo: google/gemini-2.5-pro (qualidade jurídica).
- UI: sidebar de conversas + chat com markdown + botão Exportar .docx (Times New Roman, margens ABNT).
- Templates rápidos: Petição inicial, Mandado de Segurança, Contrato, Recurso/Contestação.
