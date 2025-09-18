export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      account_vps_assignments: {
        Row: {
          account_id: string
          assigned_at: string | null
          assigned_by: string | null
          connection_status: string | null
          created_at: string | null
          id: string
          last_activity: string | null
          updated_at: string | null
          vps_id: string
        }
        Insert: {
          account_id: string
          assigned_at?: string | null
          assigned_by?: string | null
          connection_status?: string | null
          created_at?: string | null
          id?: string
          last_activity?: string | null
          updated_at?: string | null
          vps_id: string
        }
        Update: {
          account_id?: string
          assigned_at?: string | null
          assigned_by?: string | null
          connection_status?: string | null
          created_at?: string | null
          id?: string
          last_activity?: string | null
          updated_at?: string | null
          vps_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_vps_assignments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_vps_assignments_vps_id_fkey"
            columns: ["vps_id"]
            isOneToOne: false
            referencedRelation: "vps_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_snapshots: {
        Row: {
          account_id: string
          balance: number
          created_at: string | null
          daily_pnl: number | null
          equity: number
          free_margin: number | null
          id: string
          losing_trades: number | null
          margin: number | null
          monthly_pnl: number | null
          profit_loss: number | null
          snapshot_date: string
          total_trades: number | null
          winning_trades: number | null
        }
        Insert: {
          account_id: string
          balance: number
          created_at?: string | null
          daily_pnl?: number | null
          equity: number
          free_margin?: number | null
          id?: string
          losing_trades?: number | null
          margin?: number | null
          monthly_pnl?: number | null
          profit_loss?: number | null
          snapshot_date: string
          total_trades?: number | null
          winning_trades?: number | null
        }
        Update: {
          account_id?: string
          balance?: number
          created_at?: string | null
          daily_pnl?: number | null
          equity?: number
          free_margin?: number | null
          id?: string
          losing_trades?: number | null
          margin?: number | null
          monthly_pnl?: number | null
          profit_loss?: number | null
          snapshot_date?: string
          total_trades?: number | null
          winning_trades?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_snapshots_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_health_logs: {
        Row: {
          account_id: string | null
          check_type: string
          checked_at: string | null
          details: Json | null
          id: string
          response_time_ms: number | null
          status: string
          vps_id: string | null
        }
        Insert: {
          account_id?: string | null
          check_type: string
          checked_at?: string | null
          details?: Json | null
          id?: string
          response_time_ms?: number | null
          status: string
          vps_id?: string | null
        }
        Update: {
          account_id?: string | null
          check_type?: string
          checked_at?: string | null
          details?: Json | null
          id?: string
          response_time_ms?: number | null
          status?: string
          vps_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connection_health_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_health_logs_vps_id_fkey"
            columns: ["vps_id"]
            isOneToOne: false
            referencedRelation: "vps_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      copy_mappings: {
        Row: {
          copy_symbols: string[] | null
          created_at: string | null
          id: string
          ignore_symbols: string[] | null
          is_active: boolean | null
          lot_scaling_factor: number | null
          lot_scaling_type: string
          master_account_id: string
          max_lot_size: number | null
          min_lot_size: number | null
          slave_account_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          copy_symbols?: string[] | null
          created_at?: string | null
          id?: string
          ignore_symbols?: string[] | null
          is_active?: boolean | null
          lot_scaling_factor?: number | null
          lot_scaling_type: string
          master_account_id: string
          max_lot_size?: number | null
          min_lot_size?: number | null
          slave_account_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          copy_symbols?: string[] | null
          created_at?: string | null
          id?: string
          ignore_symbols?: string[] | null
          is_active?: boolean | null
          lot_scaling_factor?: number | null
          lot_scaling_type?: string
          master_account_id?: string
          max_lot_size?: number | null
          min_lot_size?: number | null
          slave_account_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "copy_mappings_master_account_id_fkey"
            columns: ["master_account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copy_mappings_slave_account_id_fkey"
            columns: ["slave_account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      copied_trades: {
        Row: {
          copy_status: string | null
          created_at: string | null
          error_message: string | null
          id: string
          lot_scaling_applied: number | null
          mapping_id: string
          master_trade_id: string
          slave_account_id: string
          slave_trade_id: string | null
          updated_at: string | null
        }
        Insert: {
          copy_status?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          lot_scaling_applied?: number | null
          mapping_id: string
          master_trade_id: string
          slave_account_id: string
          slave_trade_id?: string | null
          updated_at?: string | null
        }
        Update: {
          copy_status?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          lot_scaling_applied?: number | null
          mapping_id?: string
          master_trade_id?: string
          slave_account_id?: string
          slave_trade_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "copied_trades_mapping_id_fkey"
            columns: ["mapping_id"]
            isOneToOne: false
            referencedRelation: "copy_mappings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copied_trades_master_trade_id_fkey"
            columns: ["master_trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copied_trades_slave_account_id_fkey"
            columns: ["slave_account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copied_trades_slave_trade_id_fkey"
            columns: ["slave_trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      protection_rules: {
        Row: {
          account_id: string | null
          created_at: string | null
          enabled: boolean | null
          id: string
          rule_type: string
          settings: Json
          triggered_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          rule_type: string
          settings: Json
          triggered_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          rule_type?: string
          settings?: Json
          triggered_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "protection_rules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_status_logs: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          created_at: string | null
          id: string
          new_status: Database["public"]["Enums"]["subscription_status"] | null
          previous_status: Database["public"]["Enums"]["subscription_status"] | null
          subscription_id: string
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["subscription_status"] | null
          previous_status?: Database["public"]["Enums"]["subscription_status"] | null
          subscription_id: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["subscription_status"] | null
          previous_status?: Database["public"]["Enums"]["subscription_status"] | null
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_status_logs_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          max_accounts: number | null
          max_copy_mappings: number | null
          plan_id: string
          status: Database["public"]["Enums"]["subscription_status"] | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          max_accounts?: number | null
          max_copy_mappings?: number | null
          plan_id: string
          status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          max_accounts?: number | null
          max_copy_mappings?: number | null
          plan_id?: string
          status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      system_config: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      trade_events: {
        Row: {
          account_id: string | null
          copy_latency_ms: number | null
          created_at: string | null
          detected_at: string
          event_type: string
          id: string
          platform_trade_id: string
          processed_at: string | null
          symbol: string
          trade_data: Json
          vps_id: string | null
        }
        Insert: {
          account_id?: string | null
          copy_latency_ms?: number | null
          created_at?: string | null
          detected_at: string
          event_type: string
          id?: string
          platform_trade_id: string
          processed_at?: string | null
          symbol: string
          trade_data: Json
          vps_id?: string | null
        }
        Update: {
          account_id?: string | null
          copy_latency_ms?: number | null
          created_at?: string | null
          detected_at?: string
          event_type?: string
          id?: string
          platform_trade_id?: string
          processed_at?: string | null
          symbol?: string
          trade_data?: Json
          vps_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_events_vps_id_fkey"
            columns: ["vps_id"]
            isOneToOne: false
            referencedRelation: "vps_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_execution_queue: {
        Row: {
          attempts: number | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          execution_latency_ms: number | null
          execution_type: string
          id: string
          mapping_id: string | null
          master_trade_event_id: string | null
          max_attempts: number | null
          priority: number | null
          scheduled_at: string | null
          slave_account_id: string | null
          started_at: string | null
          status: string | null
          trade_params: Json
        }
        Insert: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          execution_latency_ms?: number | null
          execution_type: string
          id?: string
          mapping_id?: string | null
          master_trade_event_id?: string | null
          max_attempts?: number | null
          priority?: number | null
          scheduled_at?: string | null
          slave_account_id?: string | null
          started_at?: string | null
          status?: string | null
          trade_params: Json
        }
        Update: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          execution_latency_ms?: number | null
          execution_type?: string
          id?: string
          mapping_id?: string | null
          master_trade_event_id?: string | null
          max_attempts?: number | null
          priority?: number | null
          scheduled_at?: string | null
          slave_account_id?: string | null
          started_at?: string | null
          status?: string | null
          trade_params?: Json
        }
        Relationships: [
          {
            foreignKeyName: "trade_execution_queue_mapping_id_fkey"
            columns: ["mapping_id"]
            isOneToOne: false
            referencedRelation: "copy_mappings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_execution_queue_master_trade_event_id_fkey"
            columns: ["master_trade_event_id"]
            isOneToOne: false
            referencedRelation: "trade_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_execution_queue_slave_account_id_fkey"
            columns: ["slave_account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          account_id: string
          close_price: number | null
          close_time: string | null
          commission: number | null
          created_at: string | null
          id: string
          lot_size: number
          open_price: number
          open_time: string
          platform_trade_id: string
          profit_loss: number | null
          status: string | null
          swap: number | null
          symbol: string
          trade_type: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          close_price?: number | null
          close_time?: string | null
          commission?: number | null
          created_at?: string | null
          id?: string
          lot_size: number
          open_price: number
          open_time: string
          platform_trade_id: string
          profit_loss?: number | null
          status?: string | null
          swap?: number | null
          symbol: string
          trade_type: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          close_price?: number | null
          close_time?: string | null
          commission?: number | null
          created_at?: string | null
          id?: string
          lot_size?: number
          open_price?: number
          open_time?: string
          platform_trade_id?: string
          profit_loss?: number | null
          status?: string | null
          swap?: number | null
          symbol?: string
          trade_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_accounts: {
        Row: {
          account_number: string
          account_type: string | null
          balance: number | null
          broker: string | null
          created_at: string | null
          encrypted_credentials: string | null
          equity: number | null
          id: string
          is_active: boolean | null
          name: string
          platform_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_number: string
          account_type?: string | null
          balance?: number | null
          broker?: string | null
          created_at?: string | null
          encrypted_credentials?: string | null
          equity?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          platform_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_number?: string
          account_type?: string | null
          balance?: number | null
          broker?: string | null
          created_at?: string | null
          encrypted_credentials?: string | null
          equity?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          platform_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trading_accounts_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "trading_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_platforms: {
        Row: {
          api_documentation: string | null
          created_at: string | null
          default_port: number | null
          description: string | null
          id: string
          is_supported: boolean | null
          name: string
          updated_at: string | null
          version: string | null
        }
        Insert: {
          api_documentation?: string | null
          created_at?: string | null
          default_port?: number | null
          description?: string | null
          id?: string
          is_supported?: boolean | null
          name: string
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          api_documentation?: string | null
          created_at?: string | null
          default_port?: number | null
          description?: string | null
          id?: string
          is_supported?: boolean | null
          name?: string
          updated_at?: string | null
          version?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      vps_instances: {
        Row: {
          capacity: number | null
          connection_config: Json | null
          cpu_usage: number | null
          created_at: string | null
          current_load: number | null
          disk_usage: number | null
          host: string
          id: string
          last_health_check: string | null
          memory_usage: number | null
          name: string
          platform_versions: Json | null
          port: number | null
          region: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          capacity?: number | null
          connection_config?: Json | null
          cpu_usage?: number | null
          created_at?: string | null
          current_load?: number | null
          disk_usage?: number | null
          host: string
          id?: string
          last_health_check?: string | null
          memory_usage?: number | null
          name: string
          platform_versions?: Json | null
          port?: number | null
          region?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          capacity?: number | null
          connection_config?: Json | null
          cpu_usage?: number | null
          created_at?: string | null
          current_load?: number | null
          disk_usage?: number | null
          host?: string
          id?: string
          last_health_check?: string | null
          memory_usage?: number | null
          name?: string
          platform_versions?: Json | null
          port?: number | null
          region?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_trade_pnl: {
        Args: {
          p_close_price: number
          p_lot_size: number
          p_open_price: number
          p_symbol?: string
          p_trade_type: string
        }
        Returns: number
      }
    }
    Enums: {
      subscription_status: "active" | "canceled" | "past_due" | "incomplete"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never