export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agreement_installments: {
        Row: {
          agreement_id: string
          amount: number
          asaas_invoice_url: string | null
          asaas_payment_id: string | null
          company_id: string
          created_at: string
          due_date: string
          financial_transaction_id: string | null
          id: string
          installment_number: number
          paid_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agreement_id: string
          amount?: number
          asaas_invoice_url?: string | null
          asaas_payment_id?: string | null
          company_id: string
          created_at?: string
          due_date: string
          financial_transaction_id?: string | null
          id?: string
          installment_number: number
          paid_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agreement_id?: string
          amount?: number
          asaas_invoice_url?: string | null
          asaas_payment_id?: string | null
          company_id?: string
          created_at?: string
          due_date?: string
          financial_transaction_id?: string | null
          id?: string
          installment_number?: number
          paid_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agreement_installments_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "client_agreements"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_followup_audit: {
        Row: {
          company_id: string
          created_at: string
          id: string
          inactive_minutes: number | null
          lead_id: string
          message_sent: string
          open_question: string | null
          open_topic: string | null
          phone: string
          repetition_check: string
          source: string
          trigger_kind: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          inactive_minutes?: number | null
          lead_id: string
          message_sent: string
          open_question?: string | null
          open_topic?: string | null
          phone: string
          repetition_check?: string
          source?: string
          trigger_kind: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          inactive_minutes?: number | null
          lead_id?: string
          message_sent?: string
          open_question?: string | null
          open_topic?: string | null
          phone?: string
          repetition_check?: string
          source?: string
          trigger_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_followup_audit_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_followup_audit_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_followup_audit_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      asaas_configs: {
        Row: {
          api_key: string
          company_id: string
          created_at: string
          environment: string
          id: string
          last_sync_at: string | null
          updated_at: string
        }
        Insert: {
          api_key: string
          company_id: string
          created_at?: string
          environment?: string
          id?: string
          last_sync_at?: string | null
          updated_at?: string
        }
        Update: {
          api_key?: string
          company_id?: string
          created_at?: string
          environment?: string
          id?: string
          last_sync_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asaas_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asaas_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          company_id: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          new_values: Json | null
          old_values: Json | null
          user_id: string
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      cadence_messages: {
        Row: {
          company_id: string
          created_at: string
          day_number: number
          id: string
          lead_id: string
          message_text: string | null
          phone: string
          scheduled_at: string
          sent_at: string | null
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          day_number: number
          id?: string
          lead_id: string
          message_text?: string | null
          phone: string
          scheduled_at: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          day_number?: number
          id?: string
          lead_id?: string
          message_text?: string | null
          phone?: string
          scheduled_at?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cadence_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cadence_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cadence_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          budget: number | null
          campaign_id_external: string | null
          company_id: string
          created_at: string
          created_by: string
          end_date: string | null
          id: string
          name: string
          source: Database["public"]["Enums"]["campaign_source"]
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          budget?: number | null
          campaign_id_external?: string | null
          company_id: string
          created_at?: string
          created_by: string
          end_date?: string | null
          id?: string
          name: string
          source: Database["public"]["Enums"]["campaign_source"]
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          budget?: number | null
          campaign_id_external?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          end_date?: string | null
          id?: string
          name?: string
          source?: Database["public"]["Enums"]["campaign_source"]
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      case_movements: {
        Row: {
          case_id: string
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          movement_type: string
          title: string
        }
        Insert: {
          case_id: string
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          movement_type?: string
          title: string
        }
        Update: {
          case_id?: string
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          movement_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_movements_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          case_number: string | null
          client_name: string
          company_id: string
          created_at: string
          created_by: string
          id: string
          lead_id: string | null
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          case_number?: string | null
          client_name: string
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          case_number?: string | null
          client_name?: string
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      client_agreements: {
        Row: {
          client_amount: number
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          fee_amount: number
          fee_percentage: number
          first_due_date: string | null
          id: string
          installments_count: number
          lead_id: string
          notes: string | null
          payment_type: string
          status: string
          title: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          client_amount?: number
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          fee_amount?: number
          fee_percentage?: number
          first_due_date?: string | null
          id?: string
          installments_count?: number
          lead_id: string
          notes?: string | null
          payment_type?: string
          status?: string
          title?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          client_amount?: number
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          fee_amount?: number
          fee_percentage?: number
          first_due_date?: string | null
          id?: string
          installments_count?: number
          lead_id?: string
          notes?: string | null
          payment_type?: string
          status?: string
          title?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      client_companies: {
        Row: {
          company_id: string
          id: string
          user_id: string
        }
        Insert: {
          company_id: string
          id?: string
          user_id: string
        }
        Update: {
          company_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      client_conversation_messages: {
        Row: {
          company_id: string
          content: string | null
          conversation_id: string
          created_at: string
          direction: string
          id: string
          media_type: string | null
          media_url: string | null
          metadata: Json | null
          sender_type: string
          sender_user_id: string | null
        }
        Insert: {
          company_id: string
          content?: string | null
          conversation_id: string
          created_at?: string
          direction: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          metadata?: Json | null
          sender_type: string
          sender_user_id?: string | null
        }
        Update: {
          company_id?: string
          content?: string | null
          conversation_id?: string
          created_at?: string
          direction?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          metadata?: Json | null
          sender_type?: string
          sender_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_conversation_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_conversation_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "client_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_conversation_transfers: {
        Row: {
          company_id: string
          conversation_id: string
          created_at: string
          from_area_id: string | null
          from_lawyer_id: string | null
          id: string
          reason: string | null
          to_area_id: string | null
          to_lawyer_id: string | null
          transferred_by: string | null
        }
        Insert: {
          company_id: string
          conversation_id: string
          created_at?: string
          from_area_id?: string | null
          from_lawyer_id?: string | null
          id?: string
          reason?: string | null
          to_area_id?: string | null
          to_lawyer_id?: string | null
          transferred_by?: string | null
        }
        Update: {
          company_id?: string
          conversation_id?: string
          created_at?: string
          from_area_id?: string | null
          from_lawyer_id?: string | null
          id?: string
          reason?: string | null
          to_area_id?: string | null
          to_lawyer_id?: string | null
          transferred_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_conversation_transfers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_conversation_transfers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_conversation_transfers_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "client_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_conversation_transfers_from_area_id_fkey"
            columns: ["from_area_id"]
            isOneToOne: false
            referencedRelation: "legal_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_conversation_transfers_to_area_id_fkey"
            columns: ["to_area_id"]
            isOneToOne: false
            referencedRelation: "legal_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      client_conversations: {
        Row: {
          assigned_lawyer_id: string | null
          client_lead_id: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          legal_area_id: string | null
          source: string
          status: string
          subject: string | null
          unread_count: number
          updated_at: string
          whatsapp_thread_key: string | null
        }
        Insert: {
          assigned_lawyer_id?: string | null
          client_lead_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          legal_area_id?: string | null
          source?: string
          status?: string
          subject?: string | null
          unread_count?: number
          updated_at?: string
          whatsapp_thread_key?: string | null
        }
        Update: {
          assigned_lawyer_id?: string | null
          client_lead_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          legal_area_id?: string | null
          source?: string
          status?: string
          subject?: string | null
          unread_count?: number
          updated_at?: string
          whatsapp_thread_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_conversations_client_lead_id_fkey"
            columns: ["client_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_conversations_legal_area_id_fkey"
            columns: ["legal_area_id"]
            isOneToOne: false
            referencedRelation: "legal_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      closed_contracts: {
        Row: {
          client_cpf: string
          client_name: string
          client_phone: string | null
          commission_due: number | null
          commission_percentage: number
          commission_status: string
          company_id: string
          created_at: string
          created_by: string
          honorarios_estimados: number
          honorarios_recebidos: number | null
          id: string
          lead_id: string
          process_concluded_at: string | null
          process_status: string
          processo_cnj: string | null
          processo_tipo: string | null
          signed_at: string
          updated_at: string
          zapsign_document_id: string | null
        }
        Insert: {
          client_cpf: string
          client_name: string
          client_phone?: string | null
          commission_due?: number | null
          commission_percentage?: number
          commission_status?: string
          company_id: string
          created_at?: string
          created_by: string
          honorarios_estimados?: number
          honorarios_recebidos?: number | null
          id?: string
          lead_id: string
          process_concluded_at?: string | null
          process_status?: string
          processo_cnj?: string | null
          processo_tipo?: string | null
          signed_at?: string
          updated_at?: string
          zapsign_document_id?: string | null
        }
        Update: {
          client_cpf?: string
          client_name?: string
          client_phone?: string | null
          commission_due?: number | null
          commission_percentage?: number
          commission_status?: string
          company_id?: string
          created_at?: string
          created_by?: string
          honorarios_estimados?: number
          honorarios_recebidos?: number | null
          id?: string
          lead_id?: string
          process_concluded_at?: string | null
          process_status?: string
          processo_cnj?: string | null
          processo_tipo?: string | null
          signed_at?: string
          updated_at?: string
          zapsign_document_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "closed_contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closed_contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closed_contracts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closed_contracts_zapsign_document_id_fkey"
            columns: ["zapsign_document_id"]
            isOneToOne: false
            referencedRelation: "zapsign_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_charges: {
        Row: {
          amount: number
          asaas_invoice_url: string | null
          asaas_payment_id: string | null
          closed_contract_id: string
          company_id: string
          created_at: string
          due_date: string
          id: string
          notes: string | null
          paid_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          asaas_invoice_url?: string | null
          asaas_payment_id?: string | null
          closed_contract_id: string
          company_id: string
          created_at?: string
          due_date: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          asaas_invoice_url?: string | null
          asaas_payment_id?: string | null
          closed_contract_id?: string
          company_id?: string
          created_at?: string
          due_date?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_charges_closed_contract_id_fkey"
            columns: ["closed_contract_id"]
            isOneToOne: false
            referencedRelation: "closed_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_charges_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_charges_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_settings: {
        Row: {
          commission_percentage: number
          company_id: string
          contract_terms_accepted: boolean
          contract_terms_accepted_at: string | null
          contract_terms_accepted_by: string | null
          created_at: string
          id: string
          is_active: boolean
          monthly_fee: number
          updated_at: string
        }
        Insert: {
          commission_percentage?: number
          company_id: string
          contract_terms_accepted?: boolean
          contract_terms_accepted_at?: string | null
          contract_terms_accepted_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          monthly_fee?: number
          updated_at?: string
        }
        Update: {
          commission_percentage?: number
          company_id?: string
          contract_terms_accepted?: boolean
          contract_terms_accepted_at?: string | null
          contract_terms_accepted_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          monthly_fee?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          ai_disabled: boolean | null
          billing_model: Database["public"]["Enums"]["billing_model"]
          bot_name: string | null
          bot_prompt: string | null
          bot_role_description: string | null
          business_hours: Json | null
          client_support_responsible_phone: string | null
          created_at: string
          created_by: string
          custom_base_value: number | null
          decision_rules: string | null
          google_client_id: string | null
          google_client_secret: string | null
          id: string
          lawyer_cpf: string | null
          lawyer_email: string | null
          lawyer_marital_status: string | null
          lawyer_name: string | null
          lawyer_nationality: string | null
          lawyer_oab: string | null
          lawyer_oab_uf: string | null
          lawyer_phone: string | null
          lawyer_title: string
          logo_url: string | null
          name: string
          office_address: string | null
          office_cep: string | null
          office_city: string | null
          office_cnpj: string | null
          office_legal_name: string | null
          office_state: string | null
          partnership_type: Database["public"]["Enums"]["partnership_type"]
          practice_specialty: string
          service_mode: string
          shared_whatsapp_number: boolean
          timezone: string
          updated_at: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          ai_disabled?: boolean | null
          billing_model?: Database["public"]["Enums"]["billing_model"]
          bot_name?: string | null
          bot_prompt?: string | null
          bot_role_description?: string | null
          business_hours?: Json | null
          client_support_responsible_phone?: string | null
          created_at?: string
          created_by: string
          custom_base_value?: number | null
          decision_rules?: string | null
          google_client_id?: string | null
          google_client_secret?: string | null
          id?: string
          lawyer_cpf?: string | null
          lawyer_email?: string | null
          lawyer_marital_status?: string | null
          lawyer_name?: string | null
          lawyer_nationality?: string | null
          lawyer_oab?: string | null
          lawyer_oab_uf?: string | null
          lawyer_phone?: string | null
          lawyer_title?: string
          logo_url?: string | null
          name: string
          office_address?: string | null
          office_cep?: string | null
          office_city?: string | null
          office_cnpj?: string | null
          office_legal_name?: string | null
          office_state?: string | null
          partnership_type?: Database["public"]["Enums"]["partnership_type"]
          practice_specialty?: string
          service_mode?: string
          shared_whatsapp_number?: boolean
          timezone?: string
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          ai_disabled?: boolean | null
          billing_model?: Database["public"]["Enums"]["billing_model"]
          bot_name?: string | null
          bot_prompt?: string | null
          bot_role_description?: string | null
          business_hours?: Json | null
          client_support_responsible_phone?: string | null
          created_at?: string
          created_by?: string
          custom_base_value?: number | null
          decision_rules?: string | null
          google_client_id?: string | null
          google_client_secret?: string | null
          id?: string
          lawyer_cpf?: string | null
          lawyer_email?: string | null
          lawyer_marital_status?: string | null
          lawyer_name?: string | null
          lawyer_nationality?: string | null
          lawyer_oab?: string | null
          lawyer_oab_uf?: string | null
          lawyer_phone?: string | null
          lawyer_title?: string
          logo_url?: string | null
          name?: string
          office_address?: string | null
          office_cep?: string | null
          office_city?: string | null
          office_cnpj?: string | null
          office_legal_name?: string | null
          office_state?: string | null
          partnership_type?: Database["public"]["Enums"]["partnership_type"]
          practice_specialty?: string
          service_mode?: string
          shared_whatsapp_number?: boolean
          timezone?: string
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      company_ai_config: {
        Row: {
          company_id: string
          created_at: string
          custom_system_prompt: string | null
          id: string
          model: string
          provider: string
          updated_at: string
          use_openai_for_testing: boolean
        }
        Insert: {
          company_id: string
          created_at?: string
          custom_system_prompt?: string | null
          id?: string
          model?: string
          provider?: string
          updated_at?: string
          use_openai_for_testing?: boolean
        }
        Update: {
          company_id?: string
          created_at?: string
          custom_system_prompt?: string | null
          id?: string
          model?: string
          provider?: string
          updated_at?: string
          use_openai_for_testing?: boolean
        }
        Relationships: []
      }
      company_bot_agents: {
        Row: {
          agent_type: Database["public"]["Enums"]["bot_agent_type"]
          company_id: string
          contract_template: string | null
          created_at: string
          id: string
          is_active: boolean
          prompt: string | null
          required_documents: Json | null
          updated_at: string
        }
        Insert: {
          agent_type: Database["public"]["Enums"]["bot_agent_type"]
          company_id: string
          contract_template?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          prompt?: string | null
          required_documents?: Json | null
          updated_at?: string
        }
        Update: {
          agent_type?: Database["public"]["Enums"]["bot_agent_type"]
          company_id?: string
          contract_template?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          prompt?: string | null
          required_documents?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_bot_agents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_bot_agents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      company_bot_flows: {
        Row: {
          case_type: string | null
          company_id: string
          created_at: string
          custom_intro: string | null
          custom_prompt_block: string | null
          description: string | null
          enabled: boolean
          flow_key: string
          icon_emoji: string
          id: string
          is_custom: boolean
          label: string
          niche: string
          position: number
          updated_at: string
        }
        Insert: {
          case_type?: string | null
          company_id: string
          created_at?: string
          custom_intro?: string | null
          custom_prompt_block?: string | null
          description?: string | null
          enabled?: boolean
          flow_key: string
          icon_emoji?: string
          id?: string
          is_custom?: boolean
          label: string
          niche: string
          position?: number
          updated_at?: string
        }
        Update: {
          case_type?: string | null
          company_id?: string
          created_at?: string
          custom_intro?: string | null
          custom_prompt_block?: string | null
          description?: string | null
          enabled?: boolean
          flow_key?: string
          icon_emoji?: string
          id?: string
          is_custom?: boolean
          label?: string
          niche?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_bot_flows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_bot_flows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      company_cadence_config: {
        Row: {
          company_id: string
          created_at: string
          delay_minutes: number
          enabled: boolean
          id: string
          message_text: string
          step_number: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          delay_minutes: number
          enabled?: boolean
          id?: string
          message_text: string
          step_number: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          delay_minutes?: number
          enabled?: boolean
          id?: string
          message_text?: string
          step_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_cadence_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_cadence_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      company_meeting_reminder_config: {
        Row: {
          company_id: string
          created_at: string
          enabled: boolean
          id: string
          message_text: string
          minutes_before: number
          updated_at: string
          window_key: string
        }
        Insert: {
          company_id: string
          created_at?: string
          enabled?: boolean
          id?: string
          message_text: string
          minutes_before: number
          updated_at?: string
          window_key: string
        }
        Update: {
          company_id?: string
          created_at?: string
          enabled?: boolean
          id?: string
          message_text?: string
          minutes_before?: number
          updated_at?: string
          window_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_meeting_reminder_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_meeting_reminder_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      company_monitoring_plans: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          max_processes: number
          plan_type: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_processes?: number
          plan_type?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_processes?: number
          plan_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_monitoring_plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_monitoring_plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      company_niche_alerts: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          lawyer_name: string | null
          niche: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          lawyer_name?: string | null
          niche: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          lawyer_name?: string | null
          niche?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_niche_alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_niche_alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      company_offices: {
        Row: {
          address: string
          company_id: string
          complement: string | null
          created_at: string
          id: string
          is_active: boolean
          maps_url: string | null
          name: string
          position: number
          reference_point: string | null
          updated_at: string
        }
        Insert: {
          address: string
          company_id: string
          complement?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          maps_url?: string | null
          name: string
          position?: number
          reference_point?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          company_id?: string
          complement?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          maps_url?: string | null
          name?: string
          position?: number
          reference_point?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_offices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_offices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_rules: {
        Row: {
          case_type: string | null
          company_id: string | null
          conditions: Json
          created_at: string
          id: string
          is_active: boolean
          niche: string
          output: Json
          priority: number
          rule_name: string
          updated_at: string
        }
        Insert: {
          case_type?: string | null
          company_id?: string | null
          conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          niche: string
          output?: Json
          priority?: number
          rule_name: string
          updated_at?: string
        }
        Update: {
          case_type?: string | null
          company_id?: string | null
          conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          niche?: string
          output?: Json
          priority?: number
          rule_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          category: string
          company_id: string
          content: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          variables: Json
        }
        Insert: {
          category?: string
          company_id: string
          content?: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          category?: string
          company_id?: string
          content?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: []
      }
      documents: {
        Row: {
          case_id: string | null
          category: string
          company_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          lead_id: string | null
          notes: string | null
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          case_id?: string | null
          category?: string
          company_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number
          id?: string
          lead_id?: string | null
          notes?: string | null
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          case_id?: string | null
          category?: string
          company_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          lead_id?: string | null
          notes?: string | null
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      escavador_webhook_events: {
        Row: {
          attempts: number
          id: string
          last_error: string | null
          monitoramento_id: number | null
          movements_inserted: number
          next_retry_at: string | null
          numero_cnj: string | null
          payload: Json
          processed_at: string | null
          received_at: string
          status: string
        }
        Insert: {
          attempts?: number
          id?: string
          last_error?: string | null
          monitoramento_id?: number | null
          movements_inserted?: number
          next_retry_at?: string | null
          numero_cnj?: string | null
          payload: Json
          processed_at?: string | null
          received_at?: string
          status?: string
        }
        Update: {
          attempts?: number
          id?: string
          last_error?: string | null
          monitoramento_id?: number | null
          movements_inserted?: number
          next_retry_at?: string | null
          numero_cnj?: string | null
          payload?: Json
          processed_at?: string | null
          received_at?: string
          status?: string
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          amount: number
          asaas_payment_id: string | null
          category: string | null
          company_id: string
          created_at: string
          created_by: string
          description: string
          due_date: string
          id: string
          lead_id: string | null
          notes: string | null
          paid_date: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          asaas_payment_id?: string | null
          category?: string | null
          company_id: string
          created_at?: string
          created_by: string
          description: string
          due_date: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          paid_date?: string | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          asaas_payment_id?: string | null
          category?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          paid_date?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_alerts: {
        Row: {
          alert_type: string
          company_id: string
          created_at: string
          description: string
          evidence: Json | null
          id: string
          lead_id: string | null
          resolution_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          alert_type: string
          company_id: string
          created_at?: string
          description: string
          evidence?: Json | null
          id?: string
          lead_id?: string | null
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          alert_type?: string
          company_id?: string
          created_at?: string
          description?: string
          evidence?: Json | null
          id?: string
          lead_id?: string | null
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraud_alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_alerts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_documents: {
        Row: {
          company_id: string
          content: string
          file_name: string
          generated_at: string
          generated_by: string
          id: string
          lead_id: string
          template_id: string | null
          variables_used: Json
        }
        Insert: {
          company_id: string
          content?: string
          file_name: string
          generated_at?: string
          generated_by: string
          id?: string
          lead_id: string
          template_id?: string | null
          variables_used?: Json
        }
        Update: {
          company_id?: string
          content?: string
          file_name?: string
          generated_at?: string
          generated_by?: string
          id?: string
          lead_id?: string
          template_id?: string | null
          variables_used?: Json
        }
        Relationships: []
      }
      google_calendar_sync_queue: {
        Row: {
          action: string
          attempts: number | null
          created_at: string | null
          error_message: string | null
          id: string
          reminder_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action: string
          attempts?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          reminder_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action?: string
          attempts?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          reminder_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      google_calendar_webhook_logs: {
        Row: {
          channel_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          payload: Json | null
          processing_time_ms: number | null
          resource_id: string | null
          resource_state: string | null
          status_code: number | null
          user_id: string | null
        }
        Insert: {
          channel_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          processing_time_ms?: number | null
          resource_id?: string | null
          resource_state?: string | null
          status_code?: number | null
          user_id?: string | null
        }
        Update: {
          channel_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          processing_time_ms?: number | null
          resource_id?: string | null
          resource_state?: string | null
          status_code?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      kanban_boards: {
        Row: {
          color: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          icon: string
          id: string
          is_default: boolean
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          color?: string
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string
          id?: string
          is_default?: boolean
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          color?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string
          id?: string
          is_default?: boolean
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      kanban_columns: {
        Row: {
          board_id: string | null
          color: string
          company_id: string
          created_at: string
          id: string
          is_lost: boolean
          is_meeting_held: boolean
          is_won: boolean
          name: string
          position: number
        }
        Insert: {
          board_id?: string | null
          color?: string
          company_id: string
          created_at?: string
          id?: string
          is_lost?: boolean
          is_meeting_held?: boolean
          is_won?: boolean
          name: string
          position?: number
        }
        Update: {
          board_id?: string | null
          color?: string
          company_id?: string
          created_at?: string
          id?: string
          is_lost?: boolean
          is_meeting_held?: boolean
          is_won?: boolean
          name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "kanban_columns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_columns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_ia_leads: {
        Row: {
          created_at: string
          email: string | null
          id: string
          message: string | null
          name: string
          notes: string | null
          oab: string | null
          practice_area: string | null
          preferred_date: string | null
          preferred_time: string | null
          status: string
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          whatsapp: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name: string
          notes?: string | null
          oab?: string | null
          practice_area?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          status?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          whatsapp: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name?: string
          notes?: string | null
          oab?: string | null
          practice_area?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          status?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      landing_whatsapp_clicks: {
        Row: {
          created_at: string
          id: string
          page: string | null
          phone: string | null
          referrer: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          page?: string | null
          phone?: string | null
          referrer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          page?: string | null
          phone?: string | null
          referrer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      lead_cpf_alerts: {
        Row: {
          alert_type: string
          company_id: string
          cpf: string
          created_at: string
          description: string | null
          id: string
          lead_id: string
          notified_at: string | null
          payload: Json
          read_at: string | null
          title: string
        }
        Insert: {
          alert_type: string
          company_id: string
          cpf: string
          created_at?: string
          description?: string | null
          id?: string
          lead_id: string
          notified_at?: string | null
          payload?: Json
          read_at?: string | null
          title: string
        }
        Update: {
          alert_type?: string
          company_id?: string
          cpf?: string
          created_at?: string
          description?: string | null
          id?: string
          lead_id?: string
          notified_at?: string | null
          payload?: Json
          read_at?: string | null
          title?: string
        }
        Relationships: []
      }
      lead_cpf_lookups: {
        Row: {
          company_id: string
          cpf: string
          created_at: string
          error_message: string | null
          id: string
          lead_id: string
          payload: Json
          processes_count: number
          signature: string
          source: string
          status: string
        }
        Insert: {
          company_id: string
          cpf: string
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id: string
          payload?: Json
          processes_count?: number
          signature?: string
          source?: string
          status?: string
        }
        Update: {
          company_id?: string
          cpf?: string
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string
          payload?: Json
          processes_count?: number
          signature?: string
          source?: string
          status?: string
        }
        Relationships: []
      }
      lead_document_requests: {
        Row: {
          company_id: string
          created_at: string
          document_type: string
          file_url: string | null
          id: string
          lead_id: string
          notes: string | null
          received_at: string | null
          requested_at: string
          reviewed_at: string | null
          status: Database["public"]["Enums"]["document_request_status"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          document_type: string
          file_url?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          received_at?: string | null
          requested_at?: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["document_request_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          document_type?: string
          file_url?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          received_at?: string | null
          requested_at?: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["document_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_document_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_document_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_document_requests_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_kanban_history: {
        Row: {
          company_id: string
          created_at: string
          from_column_id: string | null
          from_column_name: string | null
          id: string
          lead_id: string
          moved_by: string | null
          to_column_id: string | null
          to_column_name: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          from_column_id?: string | null
          from_column_name?: string | null
          id?: string
          lead_id: string
          moved_by?: string | null
          to_column_id?: string | null
          to_column_name?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          from_column_id?: string | null
          from_column_name?: string | null
          id?: string
          lead_id?: string
          moved_by?: string | null
          to_column_id?: string | null
          to_column_name?: string | null
        }
        Relationships: []
      }
      lead_qualification_answers: {
        Row: {
          answers: Json
          case_type: string | null
          company_id: string
          created_at: string
          decided_at: string | null
          decision_result: Json | null
          id: string
          lead_id: string
          niche: string
          updated_at: string
        }
        Insert: {
          answers?: Json
          case_type?: string | null
          company_id: string
          created_at?: string
          decided_at?: string | null
          decision_result?: Json | null
          id?: string
          lead_id: string
          niche: string
          updated_at?: string
        }
        Update: {
          answers?: Json
          case_type?: string | null
          company_id?: string
          created_at?: string
          decided_at?: string | null
          decision_result?: Json | null
          id?: string
          lead_id?: string
          niche?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_qualification_answers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_qualification_answers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_qualification_answers_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_reminders: {
        Row: {
          company_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_at: string
          end_at: string | null
          google_event_id: string | null
          id: string
          lawyer_30m_sent: boolean
          lawyer_3h_sent: boolean
          lead_id: string | null
          meeting_held: boolean
          meeting_held_at: string | null
          parent_event_id: string | null
          recurrence_end: string | null
          recurrence_rule: string | null
          reminder_2h_sent: boolean
          reminder_30m_sent: boolean
          reminder_6h_sent: boolean
          reminder_type: string
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_at: string
          end_at?: string | null
          google_event_id?: string | null
          id?: string
          lawyer_30m_sent?: boolean
          lawyer_3h_sent?: boolean
          lead_id?: string | null
          meeting_held?: boolean
          meeting_held_at?: string | null
          parent_event_id?: string | null
          recurrence_end?: string | null
          recurrence_rule?: string | null
          reminder_2h_sent?: boolean
          reminder_30m_sent?: boolean
          reminder_6h_sent?: boolean
          reminder_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_at?: string
          end_at?: string | null
          google_event_id?: string | null
          id?: string
          lawyer_30m_sent?: boolean
          lawyer_3h_sent?: boolean
          lead_id?: string | null
          meeting_held?: boolean
          meeting_held_at?: string | null
          parent_event_id?: string | null
          recurrence_end?: string | null
          recurrence_rule?: string | null
          reminder_2h_sent?: boolean
          reminder_30m_sent?: boolean
          reminder_6h_sent?: boolean
          reminder_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_reminders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_reminders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_reminders_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_reminders_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "lead_reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_subscriptions: {
        Row: {
          asaas_customer_id: string | null
          asaas_subscription_id: string | null
          billing_type: string
          company_id: string
          created_at: string
          created_by: string | null
          cycle: string
          id: string
          invoice_url: string | null
          lead_id: string
          status: string
          updated_at: string
          value: number
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          billing_type?: string
          company_id: string
          created_at?: string
          created_by?: string | null
          cycle?: string
          id?: string
          invoice_url?: string | null
          lead_id: string
          status?: string
          updated_at?: string
          value?: number
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          billing_type?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          cycle?: string
          id?: string
          invoice_url?: string | null
          lead_id?: string
          status?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "lead_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_subscriptions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_summaries: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          generated_by_ai: boolean
          id: string
          lead_id: string
          summary_text: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          generated_by_ai?: boolean
          id?: string
          lead_id: string
          summary_text: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          generated_by_ai?: boolean
          id?: string
          lead_id?: string
          summary_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_summaries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_summaries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_summaries_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          area_direito: string | null
          assigned_to: string | null
          banco_agencia: string | null
          banco_conta: string | null
          banco_nome: string | null
          banco_pix: string | null
          banco_tipo_conta: string | null
          became_client_at: string | null
          bot_agent_phase: string | null
          bot_disabled: boolean
          campaign_id: string | null
          case_area: string | null
          case_classified_at: string | null
          case_classified_by: string | null
          case_confidence: number | null
          case_estimated_value: number | null
          case_keywords: string[] | null
          case_next_action: string | null
          case_subtype: string | null
          case_summary_short: string | null
          case_urgency: string | null
          company_id: string
          contract_status: string | null
          cpf: string | null
          cpf_cliente_final: string | null
          created_at: string
          email: string | null
          endereco_bairro: string | null
          endereco_cep: string | null
          endereco_cidade: string | null
          endereco_complemento: string | null
          endereco_estado: string | null
          endereco_numero: string | null
          endereco_rua: string | null
          estado_civil: string | null
          honorarios_estimados: number | null
          id: string
          is_client: boolean
          is_unread: boolean | null
          kanban_column_id: string | null
          lead_score: string | null
          message_count: number | null
          nacionalidade: string | null
          name: string
          notes: string | null
          ocr_document_type: string | null
          ocr_extracted_data: Json | null
          ocr_last_extracted_at: string | null
          ocr_pending_review: boolean
          ocr_review_token: string | null
          pending_data_warning: string | null
          phone: string | null
          processo_numero: string | null
          processo_valor: number | null
          profissao: string | null
          rg: string | null
          source: Database["public"]["Enums"]["campaign_source"] | null
          status: Database["public"]["Enums"]["lead_status"]
          tipo_caso_detalhado: string | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          value: number | null
          viability_result: Json | null
          whatsapp: string | null
        }
        Insert: {
          area_direito?: string | null
          assigned_to?: string | null
          banco_agencia?: string | null
          banco_conta?: string | null
          banco_nome?: string | null
          banco_pix?: string | null
          banco_tipo_conta?: string | null
          became_client_at?: string | null
          bot_agent_phase?: string | null
          bot_disabled?: boolean
          campaign_id?: string | null
          case_area?: string | null
          case_classified_at?: string | null
          case_classified_by?: string | null
          case_confidence?: number | null
          case_estimated_value?: number | null
          case_keywords?: string[] | null
          case_next_action?: string | null
          case_subtype?: string | null
          case_summary_short?: string | null
          case_urgency?: string | null
          company_id: string
          contract_status?: string | null
          cpf?: string | null
          cpf_cliente_final?: string | null
          created_at?: string
          email?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_estado?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          estado_civil?: string | null
          honorarios_estimados?: number | null
          id?: string
          is_client?: boolean
          is_unread?: boolean | null
          kanban_column_id?: string | null
          lead_score?: string | null
          message_count?: number | null
          nacionalidade?: string | null
          name: string
          notes?: string | null
          ocr_document_type?: string | null
          ocr_extracted_data?: Json | null
          ocr_last_extracted_at?: string | null
          ocr_pending_review?: boolean
          ocr_review_token?: string | null
          pending_data_warning?: string | null
          phone?: string | null
          processo_numero?: string | null
          processo_valor?: number | null
          profissao?: string | null
          rg?: string | null
          source?: Database["public"]["Enums"]["campaign_source"] | null
          status?: Database["public"]["Enums"]["lead_status"]
          tipo_caso_detalhado?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          value?: number | null
          viability_result?: Json | null
          whatsapp?: string | null
        }
        Update: {
          area_direito?: string | null
          assigned_to?: string | null
          banco_agencia?: string | null
          banco_conta?: string | null
          banco_nome?: string | null
          banco_pix?: string | null
          banco_tipo_conta?: string | null
          became_client_at?: string | null
          bot_agent_phase?: string | null
          bot_disabled?: boolean
          campaign_id?: string | null
          case_area?: string | null
          case_classified_at?: string | null
          case_classified_by?: string | null
          case_confidence?: number | null
          case_estimated_value?: number | null
          case_keywords?: string[] | null
          case_next_action?: string | null
          case_subtype?: string | null
          case_summary_short?: string | null
          case_urgency?: string | null
          company_id?: string
          contract_status?: string | null
          cpf?: string | null
          cpf_cliente_final?: string | null
          created_at?: string
          email?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_estado?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          estado_civil?: string | null
          honorarios_estimados?: number | null
          id?: string
          is_client?: boolean
          is_unread?: boolean | null
          kanban_column_id?: string | null
          lead_score?: string | null
          message_count?: number | null
          nacionalidade?: string | null
          name?: string
          notes?: string | null
          ocr_document_type?: string | null
          ocr_extracted_data?: Json | null
          ocr_last_extracted_at?: string | null
          ocr_pending_review?: boolean
          ocr_review_token?: string | null
          pending_data_warning?: string | null
          phone?: string | null
          processo_numero?: string | null
          processo_valor?: number | null
          profissao?: string | null
          rg?: string | null
          source?: Database["public"]["Enums"]["campaign_source"] | null
          status?: Database["public"]["Enums"]["lead_status"]
          tipo_caso_detalhado?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          value?: number | null
          viability_result?: Json | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_kanban_column_id_fkey"
            columns: ["kanban_column_id"]
            isOneToOne: false
            referencedRelation: "kanban_columns"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_ai_conversations: {
        Row: {
          company_id: string
          created_at: string
          document_type: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          document_type?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          document_type?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_ai_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_ai_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          document_type: string | null
          id: string
          is_document: boolean
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          document_type?: string | null
          id?: string
          is_document?: boolean
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          document_type?: string | null
          id?: string
          is_document?: boolean
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "legal_ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_areas: {
        Row: {
          color: string
          company_id: string
          created_at: string
          created_by: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          color?: string
          company_id: string
          created_at?: string
          created_by?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          color?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_areas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_areas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_charges: {
        Row: {
          amount: number
          asaas_invoice_url: string | null
          asaas_payment_id: string | null
          company_id: string
          confirmed_at: string
          confirmed_by: string | null
          created_at: string
          id: string
          invoice_month: string | null
          invoiced_at: string | null
          lead_id: string | null
          lead_name: string
          meeting_at: string
          notes: string | null
          paid_at: string | null
          reminder_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          asaas_invoice_url?: string | null
          asaas_payment_id?: string | null
          company_id: string
          confirmed_at?: string
          confirmed_by?: string | null
          created_at?: string
          id?: string
          invoice_month?: string | null
          invoiced_at?: string | null
          lead_id?: string | null
          lead_name: string
          meeting_at: string
          notes?: string | null
          paid_at?: string | null
          reminder_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          asaas_invoice_url?: string | null
          asaas_payment_id?: string | null
          company_id?: string
          confirmed_at?: string
          confirmed_by?: string | null
          created_at?: string
          id?: string
          invoice_month?: string | null
          invoiced_at?: string | null
          lead_id?: string | null
          lead_name?: string
          meeting_at?: string
          notes?: string | null
          paid_at?: string | null
          reminder_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_charges_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_charges_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_charges_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_charges_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "lead_reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      monitored_processes: {
        Row: {
          area: string | null
          assunto: string | null
          callback_registered_at: string | null
          case_id: string | null
          classe: string | null
          client_cpf: string | null
          client_name: string
          company_id: string
          created_at: string
          data_inicio: string | null
          data_ultima_movimentacao: string | null
          escavador_data: Json | null
          escavador_monitoring_id: number | null
          id: string
          is_active: boolean
          last_checked_at: string | null
          numero_cnj: string
          polo_ativo: string | null
          polo_passivo: string | null
          quantidade_movimentacoes: number | null
          status_predito: string | null
          tribunal_sigla: string | null
          updated_at: string
        }
        Insert: {
          area?: string | null
          assunto?: string | null
          callback_registered_at?: string | null
          case_id?: string | null
          classe?: string | null
          client_cpf?: string | null
          client_name: string
          company_id: string
          created_at?: string
          data_inicio?: string | null
          data_ultima_movimentacao?: string | null
          escavador_data?: Json | null
          escavador_monitoring_id?: number | null
          id?: string
          is_active?: boolean
          last_checked_at?: string | null
          numero_cnj: string
          polo_ativo?: string | null
          polo_passivo?: string | null
          quantidade_movimentacoes?: number | null
          status_predito?: string | null
          tribunal_sigla?: string | null
          updated_at?: string
        }
        Update: {
          area?: string | null
          assunto?: string | null
          callback_registered_at?: string | null
          case_id?: string | null
          classe?: string | null
          client_cpf?: string | null
          client_name?: string
          company_id?: string
          created_at?: string
          data_inicio?: string | null
          data_ultima_movimentacao?: string | null
          escavador_data?: Json | null
          escavador_monitoring_id?: number | null
          id?: string
          is_active?: boolean
          last_checked_at?: string | null
          numero_cnj?: string
          polo_ativo?: string | null
          polo_passivo?: string | null
          quantidade_movimentacoes?: number | null
          status_predito?: string | null
          tribunal_sigla?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monitored_processes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitored_processes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitored_processes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      monitoring_packages: {
        Row: {
          asaas_customer_id: string | null
          asaas_payment_id: string | null
          asaas_subscription_id: string | null
          company_id: string
          created_at: string
          id: string
          processes_per_package: number
          quantity: number
          status: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          asaas_subscription_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          processes_per_package?: number
          quantity?: number
          status?: string
          updated_at?: string
          user_id: string
          value?: number
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          asaas_subscription_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          processes_per_package?: number
          quantity?: number
          status?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_packages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitoring_packages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_tasks: {
        Row: {
          accepted_at: string | null
          assigned_to: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          rejected_at: string | null
          rejection_reason: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          assigned_to?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          assigned_to?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      process_billing_audit_logs: {
        Row: {
          asaas_payment_id: string | null
          company_id: string | null
          created_at: string
          details: Json | null
          error_message: string | null
          id: string
          invoice_month: string
          run_id: string
          status: string
          total_amount: number | null
          total_processes: number | null
          triggered_by: string | null
        }
        Insert: {
          asaas_payment_id?: string | null
          company_id?: string | null
          created_at?: string
          details?: Json | null
          error_message?: string | null
          id?: string
          invoice_month: string
          run_id: string
          status: string
          total_amount?: number | null
          total_processes?: number | null
          triggered_by?: string | null
        }
        Update: {
          asaas_payment_id?: string | null
          company_id?: string | null
          created_at?: string
          details?: Json | null
          error_message?: string | null
          id?: string
          invoice_month?: string
          run_id?: string
          status?: string
          total_amount?: number | null
          total_processes?: number | null
          triggered_by?: string | null
        }
        Relationships: []
      }
      process_board_columns: {
        Row: {
          board_id: string
          color: string
          company_id: string
          created_at: string
          id: string
          name: string
          position: number
          stage_type: string
          updated_at: string
        }
        Insert: {
          board_id: string
          color?: string
          company_id: string
          created_at?: string
          id?: string
          name: string
          position?: number
          stage_type?: string
          updated_at?: string
        }
        Update: {
          board_id?: string
          color?: string
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          position?: number
          stage_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_board_columns_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "process_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_board_columns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_board_columns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      process_boards: {
        Row: {
          color: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean
          legal_area_id: string
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          color?: string
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          legal_area_id: string
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          color?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          legal_area_id?: string
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_boards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_boards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_boards_legal_area_id_fkey"
            columns: ["legal_area_id"]
            isOneToOne: false
            referencedRelation: "legal_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      process_card_activity: {
        Row: {
          activity_type: string
          actor_id: string | null
          card_id: string
          company_id: string
          created_at: string
          from_column_id: string | null
          id: string
          message: string | null
          metadata: Json | null
          to_column_id: string | null
        }
        Insert: {
          activity_type: string
          actor_id?: string | null
          card_id: string
          company_id: string
          created_at?: string
          from_column_id?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          to_column_id?: string | null
        }
        Update: {
          activity_type?: string
          actor_id?: string | null
          card_id?: string
          company_id?: string
          created_at?: string
          from_column_id?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          to_column_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_card_activity_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "process_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_card_activity_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_card_activity_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      process_card_team: {
        Row: {
          added_by: string | null
          card_id: string
          company_id: string
          created_at: string
          id: string
          role_on_card: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          card_id: string
          company_id: string
          created_at?: string
          id?: string
          role_on_card?: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          card_id?: string
          company_id?: string
          created_at?: string
          id?: string
          role_on_card?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_card_team_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "process_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_card_team_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_card_team_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      process_cards: {
        Row: {
          board_id: string
          client_name: string | null
          cnj_number: string | null
          column_id: string | null
          company_id: string
          court: string | null
          created_at: string
          created_by: string | null
          description: string | null
          has_unread_movements: boolean
          id: string
          last_activity_at: string | null
          last_activity_type: string | null
          last_court_movement_at: string | null
          last_court_movement_text: string | null
          last_movement_at: string | null
          last_movement_text: string | null
          lead_id: string | null
          monitored_process_id: string | null
          next_deadline_at: string | null
          next_deadline_label: string | null
          position: number
          priority: string
          responsible_id: string | null
          title: string | null
          unread_movements_count: number
          updated_at: string
          weekly_target: number
        }
        Insert: {
          board_id: string
          client_name?: string | null
          cnj_number?: string | null
          column_id?: string | null
          company_id: string
          court?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          has_unread_movements?: boolean
          id?: string
          last_activity_at?: string | null
          last_activity_type?: string | null
          last_court_movement_at?: string | null
          last_court_movement_text?: string | null
          last_movement_at?: string | null
          last_movement_text?: string | null
          lead_id?: string | null
          monitored_process_id?: string | null
          next_deadline_at?: string | null
          next_deadline_label?: string | null
          position?: number
          priority?: string
          responsible_id?: string | null
          title?: string | null
          unread_movements_count?: number
          updated_at?: string
          weekly_target?: number
        }
        Update: {
          board_id?: string
          client_name?: string | null
          cnj_number?: string | null
          column_id?: string | null
          company_id?: string
          court?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          has_unread_movements?: boolean
          id?: string
          last_activity_at?: string | null
          last_activity_type?: string | null
          last_court_movement_at?: string | null
          last_court_movement_text?: string | null
          last_movement_at?: string | null
          last_movement_text?: string | null
          lead_id?: string | null
          monitored_process_id?: string | null
          next_deadline_at?: string | null
          next_deadline_label?: string | null
          position?: number
          priority?: string
          responsible_id?: string | null
          title?: string | null
          unread_movements_count?: number
          updated_at?: string
          weekly_target?: number
        }
        Relationships: [
          {
            foreignKeyName: "process_cards_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "process_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_cards_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "process_board_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_cards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_cards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_cards_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_cards_monitored_process_id_fkey"
            columns: ["monitored_process_id"]
            isOneToOne: false
            referencedRelation: "monitored_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      process_monitoring_charges: {
        Row: {
          asaas_invoice_url: string | null
          asaas_payment_id: string | null
          company_id: string
          created_at: string
          id: string
          invoice_month: string
          notes: string | null
          paid_at: string | null
          process_count: number
          status: string
          total_amount: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          asaas_invoice_url?: string | null
          asaas_payment_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          invoice_month: string
          notes?: string | null
          paid_at?: string | null
          process_count?: number
          status?: string
          total_amount?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          asaas_invoice_url?: string | null
          asaas_payment_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          invoice_month?: string
          notes?: string | null
          paid_at?: string | null
          process_count?: number
          status?: string
          total_amount?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      process_movements: {
        Row: {
          company_id: string
          content: string
          created_at: string
          escavador_movement_id: number | null
          id: string
          is_new: boolean
          monitored_process_id: string
          movement_date: string
          movement_type: string | null
          source_grau: number | null
          source_name: string | null
          source_sigla: string | null
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          escavador_movement_id?: number | null
          id?: string
          is_new?: boolean
          monitored_process_id: string
          movement_date: string
          movement_type?: string | null
          source_grau?: number | null
          source_name?: string | null
          source_sigla?: string | null
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          escavador_movement_id?: number | null
          id?: string
          is_new?: boolean
          monitored_process_id?: string
          movement_date?: string
          movement_type?: string | null
          source_grau?: number | null
          source_name?: string | null
          source_sigla?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_movements_monitored_process_id_fkey"
            columns: ["monitored_process_id"]
            isOneToOne: false
            referencedRelation: "monitored_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          job_title: string | null
          last_login: string | null
          lawyer_cpf: string | null
          lawyer_marital_status: string | null
          lawyer_name: string | null
          lawyer_nationality: string | null
          lawyer_oab: string | null
          lawyer_oab_uf: string | null
          operator_profile:
            | Database["public"]["Enums"]["operator_profile"]
            | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string
          id?: string
          job_title?: string | null
          last_login?: string | null
          lawyer_cpf?: string | null
          lawyer_marital_status?: string | null
          lawyer_name?: string | null
          lawyer_nationality?: string | null
          lawyer_oab?: string | null
          lawyer_oab_uf?: string | null
          operator_profile?:
            | Database["public"]["Enums"]["operator_profile"]
            | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          job_title?: string | null
          last_login?: string | null
          lawyer_cpf?: string | null
          lawyer_marital_status?: string | null
          lawyer_name?: string | null
          lawyer_nationality?: string | null
          lawyer_oab?: string | null
          lawyer_oab_uf?: string | null
          operator_profile?:
            | Database["public"]["Enums"]["operator_profile"]
            | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_discounts: {
        Row: {
          approver_role: string
          approver_user_id: string
          company_id: string
          created_at: string
          discount_percent: number
          discount_type: string
          discount_value: number
          discounted_value: number
          id: string
          original_value: number
          plan: string
          reason: string | null
          requester_user_id: string
          subscription_id: string | null
          valid_until: string | null
        }
        Insert: {
          approver_role: string
          approver_user_id: string
          company_id: string
          created_at?: string
          discount_percent: number
          discount_type: string
          discount_value: number
          discounted_value: number
          id?: string
          original_value: number
          plan: string
          reason?: string | null
          requester_user_id: string
          subscription_id?: string | null
          valid_until?: string | null
        }
        Update: {
          approver_role?: string
          approver_user_id?: string
          company_id?: string
          created_at?: string
          discount_percent?: number
          discount_type?: string
          discount_value?: number
          discounted_value?: number
          id?: string
          original_value?: number
          plan?: string
          reason?: string | null
          requester_user_id?: string
          subscription_id?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_discounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_discounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_discounts_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          asaas_customer_id: string | null
          asaas_subscription_id: string | null
          company_id: string | null
          created_at: string
          id: string
          plan: string
          status: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          plan?: string
          status?: string
          updated_at?: string
          user_id: string
          value?: number
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          plan?: string
          status?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_clicks: {
        Row: {
          clicked_at: string
          company_id: string
          id: string
          ip_address: string | null
          lead_id: string | null
          matched_at: string | null
          tracking_code: string
          tracking_link_id: string
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          clicked_at?: string
          company_id: string
          id?: string
          ip_address?: string | null
          lead_id?: string | null
          matched_at?: string | null
          tracking_code: string
          tracking_link_id: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          clicked_at?: string
          company_id?: string
          id?: string
          ip_address?: string | null
          lead_id?: string | null
          matched_at?: string | null
          tracking_code?: string
          tracking_link_id?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracking_clicks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_clicks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_clicks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_clicks_tracking_link_id_fkey"
            columns: ["tracking_link_id"]
            isOneToOne: false
            referencedRelation: "tracking_links"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_links: {
        Row: {
          campaign_id: string | null
          company_id: string
          created_at: string
          created_by: string
          default_message: string | null
          id: string
          is_active: boolean | null
          slug: string
          whatsapp_number: string
        }
        Insert: {
          campaign_id?: string | null
          company_id: string
          created_at?: string
          created_by: string
          default_message?: string | null
          id?: string
          is_active?: boolean | null
          slug: string
          whatsapp_number: string
        }
        Update: {
          campaign_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          default_message?: string | null
          id?: string
          is_active?: boolean | null
          slug?: string
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_links_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_integrations: {
        Row: {
          access_token: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          last_google_sync: string | null
          provider: string
          refresh_token: string | null
          scopes: string[] | null
          sync_enabled: boolean | null
          sync_token: string | null
          updated_at: string | null
          user_id: string
          watch_channel_id: string | null
          watch_expiration: string | null
          watch_resource_id: string | null
          watch_token: string | null
        }
        Insert: {
          access_token?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          last_google_sync?: string | null
          provider: string
          refresh_token?: string | null
          scopes?: string[] | null
          sync_enabled?: boolean | null
          sync_token?: string | null
          updated_at?: string | null
          user_id: string
          watch_channel_id?: string | null
          watch_expiration?: string | null
          watch_resource_id?: string | null
          watch_token?: string | null
        }
        Update: {
          access_token?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          last_google_sync?: string | null
          provider?: string
          refresh_token?: string | null
          scopes?: string[] | null
          sync_enabled?: boolean | null
          sync_token?: string | null
          updated_at?: string | null
          user_id?: string
          watch_channel_id?: string | null
          watch_expiration?: string | null
          watch_resource_id?: string | null
          watch_token?: string | null
        }
        Relationships: []
      }
      user_legal_areas: {
        Row: {
          area_id: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          role_in_area: string
          sees_all_area_cards: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          area_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          role_in_area: string
          sees_all_area_cards?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          area_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          role_in_area?: string
          sees_all_area_cards?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_legal_areas_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "legal_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_legal_areas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_legal_areas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_module_permissions: {
        Row: {
          company_id: string
          created_at: string
          granted: boolean
          granted_by: string | null
          id: string
          module: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          granted?: boolean
          granted_by?: string | null
          id?: string
          module: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          granted?: boolean
          granted_by?: string | null
          id?: string
          module?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_module_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_module_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          event_id: string
          event_type: string
          id: string
          payload: Json | null
          processed_at: string | null
        }
        Insert: {
          event_id: string
          event_type: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
        }
        Update: {
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
        }
        Relationships: []
      }
      whatsapp_configs: {
        Row: {
          ai_auto_reply: boolean
          ai_disabled: boolean | null
          ai_enabled: boolean
          ai_objective: string | null
          ai_prompt: string | null
          alert_whatsapp: string | null
          check_client_status: boolean | null
          communication_tone: string | null
          company_id: string
          consultation_duration: string | null
          created_at: string
          debug_mode: boolean | null
          id: string
          office_name: string | null
          phone_number: string | null
          practice_area: string | null
          scheduling_link: string | null
          status: string
          target_audience: string | null
          triage_options: Json | null
          updated_at: string
          zapi_instance_id: string
          zapi_token: string
          zapi_webhook_configured: boolean
        }
        Insert: {
          ai_auto_reply?: boolean
          ai_disabled?: boolean | null
          ai_enabled?: boolean
          ai_objective?: string | null
          ai_prompt?: string | null
          alert_whatsapp?: string | null
          check_client_status?: boolean | null
          communication_tone?: string | null
          company_id: string
          consultation_duration?: string | null
          created_at?: string
          debug_mode?: boolean | null
          id?: string
          office_name?: string | null
          phone_number?: string | null
          practice_area?: string | null
          scheduling_link?: string | null
          status?: string
          target_audience?: string | null
          triage_options?: Json | null
          updated_at?: string
          zapi_instance_id: string
          zapi_token: string
          zapi_webhook_configured?: boolean
        }
        Update: {
          ai_auto_reply?: boolean
          ai_disabled?: boolean | null
          ai_enabled?: boolean
          ai_objective?: string | null
          ai_prompt?: string | null
          alert_whatsapp?: string | null
          check_client_status?: boolean | null
          communication_tone?: string | null
          company_id?: string
          consultation_duration?: string | null
          created_at?: string
          debug_mode?: boolean | null
          id?: string
          office_name?: string | null
          phone_number?: string | null
          practice_area?: string | null
          scheduling_link?: string | null
          status?: string
          target_audience?: string | null
          triage_options?: Json | null
          updated_at?: string
          zapi_instance_id?: string
          zapi_token?: string
          zapi_webhook_configured?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          company_id: string
          created_at: string
          direction: string
          id: string
          lead_id: string | null
          message_id_external: string | null
          message_text: string | null
          phone: string
          sender_name: string | null
          timestamp: string
        }
        Insert: {
          company_id: string
          created_at?: string
          direction?: string
          id?: string
          lead_id?: string | null
          message_id_external?: string | null
          message_text?: string | null
          phone: string
          sender_name?: string | null
          timestamp?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          direction?: string
          id?: string
          lead_id?: string | null
          message_id_external?: string | null
          message_text?: string | null
          phone?: string
          sender_name?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      zapi_connect_tokens: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          token: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          expires_at?: string
          id?: string
          token?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "zapi_connect_tokens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zapi_connect_tokens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      zapsign_configs: {
        Row: {
          api_token: string
          company_id: string
          created_at: string
          default_template_id: string | null
          id: string
          sandbox: boolean
          updated_at: string
        }
        Insert: {
          api_token: string
          company_id: string
          created_at?: string
          default_template_id?: string | null
          id?: string
          sandbox?: boolean
          updated_at?: string
        }
        Update: {
          api_token?: string
          company_id?: string
          created_at?: string
          default_template_id?: string | null
          id?: string
          sandbox?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zapsign_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zapsign_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      zapsign_documents: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          document_name: string
          id: string
          lead_id: string
          sent_via_whatsapp: boolean
          sign_url: string | null
          signed_at: string | null
          signer_email: string | null
          signer_name: string
          signer_phone: string | null
          status: string
          updated_at: string
          zapsign_doc_id: string
          zapsign_doc_token: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          document_name: string
          id?: string
          lead_id: string
          sent_via_whatsapp?: boolean
          sign_url?: string | null
          signed_at?: string | null
          signer_email?: string | null
          signer_name: string
          signer_phone?: string | null
          status?: string
          updated_at?: string
          zapsign_doc_id: string
          zapsign_doc_token?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          document_name?: string
          id?: string
          lead_id?: string
          sent_via_whatsapp?: boolean
          sign_url?: string | null
          signed_at?: string | null
          signer_email?: string | null
          signer_name?: string
          signer_phone?: string | null
          status?: string
          updated_at?: string
          zapsign_doc_id?: string
          zapsign_doc_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zapsign_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zapsign_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zapsign_documents_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      companies_public: {
        Row: {
          ai_disabled: boolean | null
          billing_model: Database["public"]["Enums"]["billing_model"] | null
          business_hours: Json | null
          created_at: string | null
          id: string | null
          lawyer_name: string | null
          lawyer_title: string | null
          name: string | null
          office_address: string | null
          office_legal_name: string | null
          partnership_type:
            | Database["public"]["Enums"]["partnership_type"]
            | null
          service_mode: string | null
          shared_whatsapp_number: boolean | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          ai_disabled?: boolean | null
          billing_model?: Database["public"]["Enums"]["billing_model"] | null
          business_hours?: Json | null
          created_at?: string | null
          id?: string | null
          lawyer_name?: string | null
          lawyer_title?: string | null
          name?: string | null
          office_address?: string | null
          office_legal_name?: string | null
          partnership_type?:
            | Database["public"]["Enums"]["partnership_type"]
            | null
          service_mode?: string | null
          shared_whatsapp_number?: boolean | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          ai_disabled?: boolean | null
          billing_model?: Database["public"]["Enums"]["billing_model"] | null
          business_hours?: Json | null
          created_at?: string | null
          id?: string | null
          lawyer_name?: string | null
          lawyer_title?: string | null
          name?: string | null
          office_address?: string | null
          office_legal_name?: string | null
          partnership_type?:
            | Database["public"]["Enums"]["partnership_type"]
            | null
          service_mode?: string | null
          shared_whatsapp_number?: boolean | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_webhook_logs: { Args: never; Returns: undefined }
      company_has_legal_ai_access: {
        Args: { _company_id: string }
        Returns: boolean
      }
      find_client_by_name: {
        Args: { _company_id: string; _search_name: string }
        Returns: {
          id: string
          name: string
        }[]
      }
      get_operator_profile: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["operator_profile"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_audit_log: {
        Args: {
          _action: string
          _company_id: string
          _entity_id: string
          _entity_type: string
          _new_values?: Json
          _old_values?: Json
          _user_id: string
        }
        Returns: undefined
      }
      mark_process_card_movements_read: {
        Args: { _card_id: string }
        Returns: undefined
      }
      process_card_weekly_activity_count: {
        Args: { _card_id: string }
        Returns: number
      }
      reminder_visible_to_advogado: {
        Args: { _reminder_id: string; _user_id: string }
        Returns: boolean
      }
      unaccent: { Args: { "": string }; Returns: string }
      user_belongs_to_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_see_client_conversation: {
        Args: { _conv_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_see_process_board: {
        Args: { _board_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_see_process_card: {
        Args: { _card_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_area_access: {
        Args: { _area_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_module: {
        Args: { _company_id: string; _module: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "member" | "client" | "gerente" | "operador"
      billing_model:
        | "exito"
        | "ia_only"
        | "crm_full"
        | "plan_free"
        | "plan_completo"
        | "plan_ia_monthly"
        | "plan_ia_6m"
        | "plan_ia_12m"
        | "plan_zionads"
        | "plan_ia"
        | "plan_gestao"
        | "plan_complete"
        | "plan_enterprise"
      bot_agent_type:
        | "document_collector"
        | "viability_analyzer"
        | "contract_closer"
      campaign_source: "google" | "meta"
      document_request_status:
        | "requested"
        | "received"
        | "approved"
        | "rejected"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "negotiating"
        | "won"
        | "lost"
      operator_profile:
        | "master"
        | "advogado_responsavel"
        | "estagiario"
        | "sdr_closer"
        | "financeiro"
      partnership_type: "exito" | "mensalidade_zionads"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "member", "client", "gerente", "operador"],
      billing_model: [
        "exito",
        "ia_only",
        "crm_full",
        "plan_free",
        "plan_completo",
        "plan_ia_monthly",
        "plan_ia_6m",
        "plan_ia_12m",
        "plan_zionads",
        "plan_ia",
        "plan_gestao",
        "plan_complete",
        "plan_enterprise",
      ],
      bot_agent_type: [
        "document_collector",
        "viability_analyzer",
        "contract_closer",
      ],
      campaign_source: ["google", "meta"],
      document_request_status: [
        "requested",
        "received",
        "approved",
        "rejected",
      ],
      lead_status: [
        "new",
        "contacted",
        "qualified",
        "negotiating",
        "won",
        "lost",
      ],
      operator_profile: [
        "master",
        "advogado_responsavel",
        "estagiario",
        "sdr_closer",
        "financeiro",
      ],
      partnership_type: ["exito", "mensalidade_zionads"],
    },
  },
} as const
