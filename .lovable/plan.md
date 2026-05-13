I will implement the automatic notification for lawyers based on the case area (niche) as requested. This feature already exists for scheduled meetings, but I will expand it to notify lawyers immediately when a lead is classified as "quente" (hot) or "morno" (warm) during the conversation.

### Proposed Changes

#### 1. Backend (Edge Functions)
- **Modify `supabase/functions/zapi-webhook/index.ts`**:
    - Update the `decide_lead` tool handler to check the `company_niche_alerts` table.
    - If a lead is classified with a specific niche (e.g., Labor, Social Security) and has a positive score (hot/warm), send a WhatsApp notification to the lawyer registered for that area.
    - Include the lead's name, niche, and a short summary in the notification.

#### 2. Documentation/Instruction
- Explain that the configuration is located in the **Company Settings** (Configurações da Empresa) page.
- Direct the user to the "Notificações por Área de Atuação" section where they can add lawyers and their phone numbers for each area of law.

### Technical Details
- The system will query the `company_niche_alerts` table for the matching `company_id` and `niche`.
- It will use the Z-API integration already configured for the company to send these alerts.
- To prevent spam, notifications will only be sent for leads classified as `quente` or `morno`.

No new tables or columns are required as the database structure for this already exists.
