# Kanban de Processos — Gestão Jurídica Full Service

## Objetivo
Criar módulo de **gestão de processos por área jurídica** com quadros kanban dedicados, advogado responsável, equipe atribuída e automação via Escavador. Escritório inteiro enxerga tudo; controle granular fica com papel (gerente/operador).

## Escopo aprovado
- **7 áreas + espaço para novas**: Previdenciário, Trabalhista, Cível/Consumidor, Família, Criminal, Tributário, Empresarial (+ botão "nova área")
- **Visibilidade**: todos do escritório veem todos os processos (RLS por company_id apenas)
- **Colunas**: quadro nasce vazio; gerente monta as fases do zero (com botão opcional "usar template" no futuro)
- **Escavador**: auto-move card + notifica equipe quando detecta nova movimentação

## Modelo de dados

### Novas tabelas
- `legal_areas` — áreas jurídicas por empresa (nome, cor, ícone, ativa)
- `process_boards` — quadros kanban de processos (1 por área, ou múltiplos se o escritório quiser subdividir)
- `process_board_columns` — colunas do quadro (nome, cor, posição, `stage_type`: inicial/andamento/final/arquivo)
- `process_cards` — o processo em si dentro do quadro (vincula a `monitored_processes` + coluna atual + responsável)
- `process_card_team` — N:N de membros da equipe do card (user_id + papel: responsável, coautor, estagiário, revisor)
- `process_card_activity` — log de tudo (movimentação, comentário, upload, movimentação Escavador)

### Reaproveitamento
- `monitored_processes` continua sendo a fonte da verdade do CNJ; `process_cards` referencia
- `process_movements` já existe → dispara webhook para auto-mover
- `documents` já anexa por lead → estender para `process_card_id`

### RLS
Todos os membros da empresa (`user_belongs_to_company`) leem/editam. Apenas gerente/admin criam áreas e quadros. Log em `audit_logs` de quem moveu cada card.

## UI/UX

### Nova rota `/processos-kanban`
```text
┌─ Sidebar áreas ─┬─ Quadro selecionado ────────────────────┐
│ ⚖  Previdenc.  │  [Filtro: responsável ▾] [Buscar CNJ]   │
│ 👷 Trabalhista │  ┌─Inicial─┬─Instr.─┬─Sent.─┬─Arquiv.─┐ │
│ 🏛  Cível      │  │ Card... │ Card.. │ Card..│  ...    │ │
│ 👨‍👩 Família    │  │ [👤 Dr. │        │       │         │ │
│ 🚨 Criminal   │  │  Silva] │        │       │         │ │
│ 💰 Tributário │  └─────────┴────────┴───────┴─────────┘ │
│ 🏢 Empresarial│                                          │
│ + Nova área   │                                          │
└───────────────┴──────────────────────────────────────────┘
```

### Card do processo mostra
- Nº CNJ + cliente + vara
- **Avatar do responsável** + badges da equipe
- Prazo mais próximo (audiência/petição) com cor
- Última movimentação Escavador (data + resumo)
- Ícones: 📎 docs, 💬 comentários, ⚠️ alerta

### Drawer ao clicar no card
Abas: **Resumo** · **Movimentações** (Escavador em tempo real) · **Equipe** (add/remove) · **Documentos** · **Comentários internos** · **Atividade** (log completo)

### Fluxo do gerente
1. `/processos-kanban` → "Criar área" → nome + cor + ícone
2. Dentro da área → "Criar quadro" → nome (pode ter "Judicial" e "Administrativo" separados)
3. Adiciona colunas do zero (nome, cor, tipo)
4. Ao vincular um processo já monitorado → escolhe o card, responsável e equipe

## Automação Escavador

Trigger em `process_movements` quando novo evento entra:
1. Busca `process_cards` do CNJ
2. Aplica **regras de mapeamento** (opcional, configurável por coluna: "palavras-chave → mover para X")
3. Move o card + registra em `process_card_activity`
4. Notifica **responsável + equipe** via WhatsApp (reaproveita `notify-meeting-scheduled` como base) + sino no app

Sem regra configurada = só notifica sem mover.

## Notificações
- Nova movimentação → WhatsApp + sino p/ responsável + equipe
- Card atribuído a você → sino
- Comentário mencionando @você → sino
- Prazo em 3d/1d/hoje → WhatsApp

## Entrega em fases

**Fase 1 — Fundação (esta implementação)**
- Migração: `legal_areas`, `process_boards`, `process_board_columns`, `process_cards`, `process_card_team`, `process_card_activity` + RLS + grants
- Página `/processos-kanban` com sidebar de áreas + kanban drag-drop (reaproveita `DroppableColumn`/`DraggableLeadCard`)
- CRUD de áreas/quadros/colunas para gerente
- Vincular processo monitorado a um card + atribuir responsável/equipe
- Drawer do card com abas Resumo/Movimentações/Equipe/Documentos
- Item no menu lateral "Processos (Kanban)"

**Fase 2 — Automação (próxima)**
- Regras de auto-move por palavra-chave nas colunas
- Notificações WhatsApp/sino para equipe
- Prazos e alertas
- Comentários com @menção
- Templates prontos de coluna por área (opcional)

**Fase 3 — Extras**
- Dashboard do sócio (produtividade por advogado, distribuição de carga, funil de resultados)
- Visão do cliente (link público simplificado)
- Relatórios exportáveis

## Detalhes técnicos
- Reaproveita `@dnd-kit` já instalado (`DndContext`, `useDroppable`, `useSortable`)
- Componentes: `ProcessKanbanPage`, `LegalAreaSidebar`, `ProcessBoard`, `ProcessCard`, `ProcessCardDrawer`, `TeamPicker`, `NewLegalAreaDialog`, `NewProcessBoardDialog`, `ColumnSettingsDialog`
- Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE process_cards, process_card_activity` para atualização ao vivo entre a equipe
- Trigger `on_process_movement_insert` para futura automação (na fase 2)

Confirma que posso seguir com a **Fase 1** exatamente assim?