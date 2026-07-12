# Plano — Laura para clientes existentes (modo compartilhado)

## Decisões do usuário (respostas às 5 perguntas)

1. **Identificação** → Laura busca por **nome completo + CPF** (sempre pede os dois para evitar ambiguidade).
2. **Advogado solicitado** → Laura **sempre chama** o advogado que o cliente pediu, mesmo que não seja o responsável pelo processo.
3. **Status do processo**:
   - Se o processo estiver no **monitoramento** → Laura responde a última movimentação.
   - Se **não estiver monitorado** → Laura informa o **horário de atendimento** e encaminha para atendimento humano.
4. **Recepção pelo advogado/setor** → Cada aba do sistema terá uma **sub-aba separada por assunto/setor** (o advogado vê as conversas dentro do próprio AdvOne, organizadas por área/tema).
5. **Armazenamento** → Conversas de clientes ficam **separadas do funil de leads**, com:
   - **Download completo da conversa** (export em PDF/TXT).
   - **Proibido apagar** (append-only, sem delete mesmo para admin — apenas arquivar).

## Próximos passos (quando o usuário mandar implementar)

### Banco
- Nova tabela `client_conversations` (separada de `leads`):
  - `id`, `company_id`, `client_lead_id` (FK para o lead-cliente), `subject_area` (aba/setor), `assigned_lawyer_id`, `status` (ativa/arquivada), timestamps.
  - **Sem coluna `deleted_at`**, sem policy de DELETE.
- Nova tabela `client_conversation_messages` (append-only):
  - `id`, `conversation_id`, `direction` (in/out), `sender_type` (client/laura/lawyer), `content`, `media_url`, `created_at`.
  - Trigger que bloqueia UPDATE/DELETE.
- RLS: advogado vê conversas onde é `assigned_lawyer_id` OU tem acesso à `subject_area` (via `user_legal_areas`). Admin/member/gerente veem tudo da empresa.

### Tools da Laura (edge function bot)
- `identify_client(nome_completo, cpf)` → retorna `{client_id, nome, advogado_responsavel, processos_monitorados[]}`.
- `get_process_status(client_id)` → última movimentação de cada processo monitorado (linguagem natural). Se nenhum monitorado, retorna `not_monitored` e Laura informa horário de atendimento.
- `request_lawyer(client_id, nome_advogado)` → fuzzy match na lista de advogados da empresa; abre `client_conversation` com `assigned_lawyer_id` = advogado pedido (mesmo se não for o responsável).
- `route_to_sector(client_id, assunto)` → cria `client_conversation` com `subject_area` do assunto.

### UI
- Nova página **"Conversas de Clientes"** com abas por setor/área (Previdenciário, Trabalhista, etc.).
- Cada conversa tem botão **"Baixar conversa completa"** (PDF).
- **Sem botão de deletar** — apenas "Arquivar".

### Prompt da Laura (modo cliente)
- Fluxo 100% conversacional (sem menus).
- Sempre pede nome completo + CPF antes de qualquer ação.
- Se cliente pedir advogado X → chama X sem questionar.
- Se pedir status do processo → chama tool; se não monitorado, informa horário.
- Nunca diz "vou consultar o sistema"; fala natural ("só um instante").

---

**Status atual: apenas planejamento. Nada foi codado ainda.**
