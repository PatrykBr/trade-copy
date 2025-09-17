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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      account_vps_assignments: {
        Row: {
          account_id: string | null
          assigned_at: string | null
          connection_established_at: string | null
          error_count: number | null
          error_message: string | null
          id: string
          last_ping: string | null
          status: string | null
          vps_id: string | null
        }
        Insert: {
          account_id?: string | null
          assigned_at?: string | null
          connection_established_at?: string | null
          error_count?: number | null
          error_message?: string | null
          id?: string
          last_ping?: string | null
          status?: string | null
          vps_id?: string | null
        }
        Update: {
          account_id?: string | null
          assigned_at?: string | null
          connection_established_at?: string | null
          error_count?: number | null
          error_message?: string | null
          id?: string
          last_ping?: string | null
          status?: string | null
          vps_id?: string | null
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
        copied_trades: {
          Row: {
            copied_at: string | null
            copy_status: string | null
            created_at: string | null
            error_message: string | null
            id: string
            mapping_id: string
            master_trade_id: string
            slave_trade_id: string | null
            updated_at: string | null
          }
          Insert: {
            copied_at?: string | null
            copy_status?: string | null
            created_at?: string | null
            error_message?: string | null
            id?: string
            mapping_id: string
            master_trade_id: string
            slave_trade_id?: string | null
            updated_at?: string | null
          }
          Update: {
            copied_at?: string | null
            copy_status?: string | null
            created_at?: string | null
            error_message?: string | null
            id?: string
            mapping_id?: string
            master_trade_id?: string
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
              foreignKeyName: "copied_trades_slave_trade_id_fkey"
              columns: ["slave_trade_id"]
              isOneToOne: false
              referencedRelation: "trades"
              referencedColumns: ["id"]
            },
          ]
        }
        copy_mappings: {
          Row: {
            copy_sl_tp: boolean | null
            copy_symbols: string[] | null
            created_at: string | null
            id: string
            ignore_symbols: string[] | null
            is_active: boolean | null
            lot_scaling_type: string | null
            lot_scaling_value: number | null
            master_account_id: string
            max_lot_size: number | null
            min_lot_size: number | null
            slave_account_id: string
            updated_at: string | null
            user_id: string
          }
          Insert: {
            copy_sl_tp?: boolean | null
            copy_symbols?: string[] | null
            created_at?: string | null
            id?: string
            ignore_symbols?: string[] | null
            is_active?: boolean | null
            lot_scaling_type?: string | null
            lot_scaling_value?: number | null
            master_account_id: string
            max_lot_size?: number | null
            min_lot_size?: number | null
            slave_account_id: string
            updated_at?: string | null
            user_id: string
          }
          Update: {
            copy_sl_tp?: boolean | null
            copy_symbols?: string[] | null
            created_at?: string | null
            id?: string
            ignore_symbols?: string[] | null
            is_active?: boolean | null
            lot_scaling_type?: string | null
            lot_scaling_value?: number | null
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
            {
              foreignKeyName: "copy_mappings_user_id_fkey"
              columns: ["user_id"]
              isOneToOne: false
              referencedRelation: "users"
              referencedColumns: ["id"]
            },
          ]
        }
        plans: {
          Row: {
            created_at: string | null
            id: string
            interval: string
            is_default: boolean | null
            max_accounts: number
            max_copy_mappings: number
            name: string
            price: number
            stripe_price_id: string | null
            updated_at: string | null
          }
          Insert: {
            created_at?: string | null
            id: string
            interval: string
            is_default?: boolean | null
            max_accounts: number
            max_copy_mappings: number
            name: string
            price?: number
            stripe_price_id?: string | null
            updated_at?: string | null
          }
          Update: {
            created_at?: string | null
            id?: string
            interval?: string
            is_default?: boolean | null
            max_accounts?: number
            max_copy_mappings?: number
            name?: string
            price?: number
            stripe_price_id?: string | null
            updated_at?: string | null
          }
          Relationships: []
        }
        protection_rules: {
          Row: {
            account_id: string | null
            created_at: string | null
            id: string
            is_active: boolean | null
            rule_type: string
            threshold_percentage: number | null
            threshold_value: number | null
            triggered_at: string | null
            updated_at: string | null
            user_id: string
          }
          Insert: {
            account_id?: string | null
            created_at?: string | null
            id?: string
            is_active?: boolean | null
            rule_type: string
            threshold_percentage?: number | null
            threshold_value?: number | null
            triggered_at?: string | null
            updated_at?: string | null
            user_id: string
          }
          Update: {
            account_id?: string | null
            created_at?: string | null
            id?: string
            is_active?: boolean | null
            rule_type?: string
            threshold_percentage?: number | null
            threshold_value?: number | null
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
            {
              foreignKeyName: "protection_rules_user_id_fkey"
              columns: ["user_id"]
              isOneToOne: false
              referencedRelation: "users"
              referencedColumns: ["id"]
            },
          ]
        }
        stripe_events: {
          Row: {
            created_at: string | null
            error_message: string | null
            id: string
            processed_at: string | null
            status: string
            type: string
          }
          Insert: {
            created_at?: string | null
            error_message?: string | null
            id: string
            processed_at?: string | null
            status?: string
            type: string
          }
          Update: {
            created_at?: string | null
            error_message?: string | null
            id?: string
            processed_at?: string | null
            status?: string
            type?: string
          }
          Relationships: []
        }
        subscription_audit: {
          Row: {
            created_at: string | null
            event_id: string | null
            id: string
            new_plan_name: string | null
            new_status: Database["public"]["Enums"]["subscription_status"] | null
            previous_plan_name: string | null
            previous_status: Database["public"]["Enums"]["subscription_status"] | null
            subscription_id: string | null
            user_id: string | null
          }
          Insert: {
            created_at?: string | null
            event_id?: string | null
            id?: string
            new_plan_name?: string | null
            new_status?: Database["public"]["Enums"]["subscription_status"] | null
            previous_plan_name?: string | null
            previous_status?: Database["public"]["Enums"]["subscription_status"] | null
            subscription_id?: string | null
            user_id?: string | null
          }
          Update: {
            created_at?: string | null
            event_id?: string | null
            id?: string
            new_plan_name?: string | null
            new_status?: Database["public"]["Enums"]["subscription_status"] | null
            previous_plan_name?: string | null
            previous_status?: Database["public"]["Enums"]["subscription_status"] | null
            subscription_id?: string | null
            user_id?: string | null
          }
          Relationships: [
            {
              foreignKeyName: "subscription_audit_subscription_id_fkey"
              columns: ["subscription_id"]
              isOneToOne: false
              referencedRelation: "subscriptions"
              referencedColumns: ["id"]
            },
            {
              foreignKeyName: "subscription_audit_user_id_fkey"
              columns: ["user_id"]
              isOneToOne: false
              referencedRelation: "users"
              referencedColumns: ["id"]
            },
          ]
        }
        subscriptions: {
          Row: {
            billing_cycle: string | null
            cancel_at_period_end: boolean | null
            created_at: string | null
            current_period_end: string
            current_period_start: string
            id: string
            max_accounts: number | null
            max_copy_mappings: number | null
            plan_name: string
            plan_price: number
            status: Database["public"]["Enums"]["subscription_status"] | null
            stripe_customer_id: string | null
            stripe_price_id: string | null
            stripe_subscription_id: string | null
            updated_at: string | null
            user_id: string
          }
          Insert: {
            billing_cycle?: string | null
            cancel_at_period_end?: boolean | null
            created_at?: string | null
            current_period_end: string
            current_period_start: string
            id?: string
            max_accounts?: number | null
            max_copy_mappings?: number | null
            plan_name: string
            plan_price: number
            status?: Database["public"]["Enums"]["subscription_status"] | null
            stripe_customer_id?: string | null
            stripe_price_id?: string | null
            stripe_subscription_id?: string | null
            updated_at?: string | null
            user_id: string
          }
          Update: {
            billing_cycle?: string | null
            cancel_at_period_end?: boolean | null
            created_at?: string | null
            current_period_end?: string
            current_period_start?: string
            id?: string
            max_accounts?: number | null
            max_copy_mappings?: number | null
            plan_name?: string
            plan_price?: number
            status?: Database["public"]["Enums"]["subscription_status"] | null
            stripe_customer_id?: string | null
            stripe_price_id?: string | null
            stripe_subscription_id?: string | null
            updated_at?: string | null
            user_id?: string
          }
          Relationships: [
            {
              foreignKeyName: "subscriptions_user_id_fkey"
              columns: ["user_id"]
              isOneToOne: true
              referencedRelation: "users"
              referencedColumns: ["id"]
            },
          ]
        }
        trades: {
          Row: {
            account_id: string
            close_price: number | null
            closed_at: string | null
            commission: number | null
            created_at: string | null
            id: string
            lot_size: number
            open_price: number
            opened_at: string
            platform_trade_id: string
            profit_loss: number | null
            status: string | null
            stop_loss: number | null
            swap: number | null
            symbol: string
            take_profit: number | null
            trade_type: string
            updated_at: string | null
          }
          Insert: {
            account_id: string
            close_price?: number | null
            closed_at?: string | null
            commission?: number | null
            created_at?: string | null
            id?: string
            lot_size: number
            open_price: number
            opened_at: string
            platform_trade_id: string
            profit_loss?: number | null
            status?: string | null
            stop_loss?: number | null
            swap?: number | null
            symbol: string
            take_profit?: number | null
            trade_type: string
            updated_at?: string | null
          }
          Update: {
            account_id?: string
            close_price?: number | null
            closed_at?: string | null
            commission?: number | null
            created_at?: string | null
            id?: string
            lot_size?: number
            open_price?: number
            opened_at?: string
            platform_trade_id?: string
            profit_loss?: number | null
            status?: string | null
            stop_loss?: number | null
            swap?: number | null
            symbol?: string
            take_profit?: number | null
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
            account_name: string
            account_number: string
            account_type: string
            balance: number | null
            created_at: string | null
            currency: string | null
            encrypted_credentials: string | null
            equity: number | null
            free_margin: number | null
            id: string
            is_active: boolean | null
            last_sync_at: string | null
            margin: number | null
            platform_id: string
            server: string | null
            updated_at: string | null
            user_id: string
          }
          Insert: {
            account_name: string
            account_number: string
            account_type: string
            balance?: number | null
            created_at?: string | null
            currency?: string | null
            encrypted_credentials?: string | null
            equity?: number | null
            free_margin?: number | null
            id?: string
            is_active?: boolean | null
            last_sync_at?: string | null
            margin?: number | null
            platform_id: string
            server?: string | null
            updated_at?: string | null
            user_id: string
          }
          Update: {
            account_name?: string
            account_number?: string
            account_type?: string
            balance?: number | null
            created_at?: string | null
            currency?: string | null
            encrypted_credentials?: string | null
            equity?: number | null
            free_margin?: number | null
            id?: string
            is_active?: boolean | null
            last_sync_at?: string | null
            margin?: number | null
            platform_id?: string
            server?: string | null
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
            {
              foreignKeyName: "trading_accounts_user_id_fkey"
              columns: ["user_id"]
              isOneToOne: false
              referencedRelation: "users"
              referencedColumns: ["id"]
            },
          ]
        }
        trading_platforms: {
          Row: {
            api_endpoint: string | null
            code: string
            created_at: string | null
            id: string
            is_active: boolean | null
            logo_url: string | null
            name: string
            supports_copy_trading: boolean | null
          }
          Insert: {
            api_endpoint?: string | null
            code: string
            created_at?: string | null
            id?: string
            is_active?: boolean | null
            logo_url?: string | null
            name: string
            supports_copy_trading?: boolean | null
          }
          Update: {
            api_endpoint?: string | null
            code?: string
            created_at?: string | null
            id?: string
            is_active?: boolean | null
            logo_url?: string | null
            name?: string
            supports_copy_trading?: boolean | null
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

  // Helper generic utility types
  export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
  export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"]
  export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"]
  export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T]

  export const Constants = {
    public: {
      Enums: {
        subscription_status: ["active", "canceled", "past_due", "incomplete"],
      },
    },
  } as const