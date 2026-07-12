
# Perfis de escritório + roteamento automático pra área

## O que vai mudar pro usuário

### 1. Novos perfis no cadastro de usuário
Ao cadastrar alguém, o Advogado Master escolhe **1 dos 5 perfis**:

| Perfil | O que enxerga | Pode mover cards? |
|---|---|---|
| **Advogado Master** | Tudo. Único que cria/edita quadros, áreas, usuários, integrações. | Sim, em qualquer quadro |
| **Advogado Responsável** | Só quadros das áreas dele. Vê todos os cards da área. | Sim |
| **Estagiário** | Só quadros das áreas dele. Master escolhe entre "vê tudo da área" ou "só cards em que está no time". | Sim, ver + mover + notas |
| **SDR / Closer** | Só Kanban Comercial + Conversas. Nunca vê honorários fechados. Perde acesso ao lead depois de marcar o quadro de destino. | Sim, só no comercial |
| **Financeiro** | Tudo do módulo Financeiro (ver + editar). Não vê Kanban de processos. | — |

### 2. Áreas do usuário (multi-área)
No cadastro de Adv. Responsável e Estagiário, Master seleciona **1 ou mais áreas** (Previdenciário, Trabalhista, Cível…). Pode adicionar/remover depois sem recriar usuário.

Pra estagiário, um toggle extra por área: **"Este estagiário vê todos os cards da área?"** — permite escritório pequeno usar 1 estagiário em várias áreas vendo tudo, e escritório grande restringir só à carteira dele.

### 3. Modal obrigatório ao mover lead pra "Ganho"
Quando qualquer usuário arrasta um lead pra coluna Ganho no Kanban Comercial, abre modal:

```text
┌─────────────────────────────────────────────┐
│ Cliente fechou! Para qual área encaminhar?  │
├─────────────────────────────────────────────┤
│ ○ Previdenciário  (Dr. João, Dra. Maria)    │
│ ○ Trabalhista     (Dr. Pedro)               │
│ ○ Cível           (Dra. Ana)                │
│                                             │
│ Responsável principal: [dropdown]           │
│ Adicionar ao time:  ☐ Estag. Lucas          │
│                     ☐ Estag. Bia            │
│                                             │
│         [Cancelar]  [Confirmar e Enviar]    │
└─────────────────────────────────────────────┘
```

Só depois disso o card é criado no quadro da área escolhida, já com responsável + time. Responsável recebe notificação (sino).

### 4. SDR perde acesso ao cliente após envio
Depois de confirmar o modal, o SDR/Closer não vê mais aquele lead na lista dele — o cliente "sai" do funil comercial e vai só pro quadro da área jurídica.

## Detalhes técnicos

**Banco (1 migration):**
- Novo enum `operator_profile`: `master`, `advogado_responsavel`, `estagiario`, `sdr_closer`, `financeiro`
- Nova coluna `profiles.operator_profile`
- Nova tabela `user_legal_areas (user_id, area_id, role_in_area, sees_all_area_cards bool)`
- Função `user_has_area_access(user_id, area_id)` SECURITY DEFINER
- Função `user_can_see_process_card(user_id, card_id)` que combina área + team + flag
- Novas RLS em `process_cards`, `process_boards`, `process_board_columns`, `process_card_activity` usando essas funções
- Nova RLS em `closed_contracts` bloqueando `sdr_closer` de ver `amount` (via coluna mascarada em view)
- Nova RLS em `leads`: SDR não vê leads onde `is_client=true` (já foi despachado)
- Remover trigger `auto_create_process_card_on_won` (será substituído por chamada explícita do modal)

**Frontend:**
- Atualizar `OperadorPermissionsDialog` → renomear pra `UserProfileDialog`, adicionar seletor de perfil + multi-select de áreas + toggle "vê tudo da área" por estagiário
- Novo componente `WonHandoffDialog` disparado ao mover pra coluna `is_won=true` no Kanban Comercial
- Atualizar `useModulePermissions` pra respeitar `operator_profile`
- Ocultar campo de valor em `LeadContract`/`closed_contracts` quando perfil = SDR/Closer
- Atualizar `AppSidebar` pra filtrar menu por perfil
- Página `AccessManagement` mostra perfil + áreas de cada usuário

## Fora do escopo desta rodada
- Migração de usuários existentes (todos ficam como `operador` sem perfil; Master edita depois)
- Relatório de produtividade por estagiário/responsável
- Notificação por WhatsApp na virada (só sino no sistema por enquanto)

Depois que você aprovar, mando a migration primeiro (você revisa), e na sequência atualizo as telas.
