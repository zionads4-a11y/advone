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
            foreignKeyName: "cases_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
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
        ]
      }
      companies: {
        Row: {
          business_hours: Json | null
          created_at: string
          created_by: string
          id: string
          logo_url: string | null
          name: string
          updated_at: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          business_hours?: Json | null
          created_at?: string
          created_by: string
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          business_hours?: Json | null
          created_at?: string
          created_by?: string
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
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
            foreignKeyName: "documents_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "financial_transactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_columns: {
        Row: {
          color: string
          company_id: string
          created_at: string
          id: string
          is_lost: boolean
          is_won: boolean
          name: string
          position: number
        }
        Insert: {
          color?: string
          company_id: string
          created_at?: string
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name: string
          position?: number
        }
        Update: {
          color?: string
          company_id?: string
          created_at?: string
          id?: string
          is_lost?: boolean
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
          id: string
          lead_id: string
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
          id?: string
          lead_id: string
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
          id?: string
          lead_id?: string
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
          assigned_to: string | null
          bot_disabled: boolean
          campaign_id: string | null
          company_id: string
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          kanban_column_id: string | null
          lead_score: string | null
          name: string
          notes: string | null
          phone: string | null
          processo_numero: string | null
          processo_valor: number | null
          source: Database["public"]["Enums"]["campaign_source"] | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          value: number | null
          whatsapp: string | null
        }
        Insert: {
          assigned_to?: string | null
          bot_disabled?: boolean
          campaign_id?: string | null
          company_id: string
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          kanban_column_id?: string | null
          lead_score?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          processo_numero?: string | null
          processo_valor?: number | null
          source?: Database["public"]["Enums"]["campaign_source"] | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          value?: number | null
          whatsapp?: string | null
        }
        Update: {
          assigned_to?: string | null
          bot_disabled?: boolean
          campaign_id?: string | null
          company_id?: string
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          kanban_column_id?: string | null
          lead_score?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          processo_numero?: string | null
          processo_valor?: number | null
          source?: Database["public"]["Enums"]["campaign_source"] | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          value?: number | null
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
            foreignKeyName: "leads_kanban_column_id_fkey"
            columns: ["kanban_column_id"]
            isOneToOne: false
            referencedRelation: "kanban_columns"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      whatsapp_configs: {
        Row: {
          ai_auto_reply: boolean
          ai_enabled: boolean
          ai_objective: string | null
          ai_prompt: string | null
          alert_whatsapp: string | null
          communication_tone: string | null
          company_id: string
          consultation_duration: string | null
          created_at: string
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
          ai_enabled?: boolean
          ai_objective?: string | null
          ai_prompt?: string | null
          alert_whatsapp?: string | null
          communication_tone?: string | null
          company_id: string
          consultation_duration?: string | null
          created_at?: string
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
          ai_enabled?: boolean
          ai_objective?: string | null
          ai_prompt?: string | null
          alert_whatsapp?: string | null
          communication_tone?: string | null
          company_id?: string
          consultation_duration?: string | null
          created_at?: string
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
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_belongs_to_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "member" | "client" | "gerente" | "operador"
      campaign_source: "google" | "meta"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "negotiating"
        | "won"
        | "lost"
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
      campaign_source: ["google", "meta"],
      lead_status: [
        "new",
        "contacted",
        "qualified",
        "negotiating",
        "won",
        "lost",
      ],
    },
  },
} as const
