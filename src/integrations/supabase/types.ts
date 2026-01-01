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
      bill_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          template_data: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          template_data: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          template_data?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      company_profiles: {
        Row: {
          address: string | null
          billing_settings: Json | null
          city: string | null
          company_name: string
          created_at: string | null
          email: string | null
          gstin: string | null
          id: string
          phone: string
          pincode: string | null
          state: string | null
          thank_you_note: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          billing_settings?: Json | null
          city?: string | null
          company_name: string
          created_at?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          phone: string
          pincode?: string | null
          state?: string | null
          thank_you_note?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          billing_settings?: Json | null
          city?: string | null
          company_name?: string
          created_at?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          phone?: string
          pincode?: string | null
          state?: string | null
          thank_you_note?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      counters: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          discount_type: string
          discount_value: number
          end_date: string | null
          id: string
          is_active: boolean | null
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          discount_type: string
          discount_value: number
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          name: string
          phone: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          phone: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      hsn_codes: {
        Row: {
          created_at: string | null
          description: string | null
          gst_rate: number
          hsn_code: string
          id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          gst_rate: number
          hsn_code: string
          id?: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          gst_rate?: number
          hsn_code?: string
          id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          bill_number: string
          counter_id: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          discount_amount: number | null
          id: string
          items_data: Json
          synced: boolean | null
          tax_amount: number
          total_amount: number
        }
        Insert: {
          bill_number: string
          counter_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount_amount?: number | null
          id?: string
          items_data: Json
          synced?: boolean | null
          tax_amount: number
          total_amount: number
        }
        Update: {
          bill_number?: string
          counter_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount_amount?: number | null
          id?: string
          items_data?: Json
          synced?: boolean | null
          tax_amount?: number
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_counter_id_fkey"
            columns: ["counter_id"]
            isOneToOne: false
            referencedRelation: "counters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      kitchen_orders: {
        Row: {
          bill_number: string
          created_at: string
          created_by: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          items_data: Json
          notes: string | null
          order_type: string | null
          status: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          bill_number: string
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          items_data: Json
          notes?: string | null
          order_type?: string | null
          status?: string | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          bill_number?: string
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          items_data?: Json
          notes?: string | null
          order_type?: string | null
          status?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      live_orders: {
        Row: {
          created_at: string | null
          created_by: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          items_data: Json
          notes: string | null
          order_type: string | null
          status: string | null
          table_number: string | null
          total_amount: number | null
          updated_at: string | null
          waiter_id: string | null
          waiter_name: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          items_data?: Json
          notes?: string | null
          order_type?: string | null
          status?: string | null
          table_number?: string | null
          total_amount?: number | null
          updated_at?: string | null
          waiter_id?: string | null
          waiter_name?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          items_data?: Json
          notes?: string | null
          order_type?: string | null
          status?: string | null
          table_number?: string | null
          total_amount?: number | null
          updated_at?: string | null
          waiter_id?: string | null
          waiter_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_orders_waiter_id_fkey"
            columns: ["waiter_id"]
            isOneToOne: false
            referencedRelation: "waiters"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_points: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_name: string | null
          customer_phone: string
          id: string
          points: number | null
          total_spent: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_name?: string | null
          customer_phone: string
          id?: string
          points?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_name?: string | null
          customer_phone?: string
          id?: string
          points?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      product_discounts: {
        Row: {
          created_at: string | null
          created_by: string | null
          discount_amount: number | null
          discount_percentage: number
          discount_type: string | null
          end_date: string
          id: string
          is_active: boolean | null
          product_id: string | null
          start_date: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          discount_percentage: number
          discount_type?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          product_id?: string | null
          start_date: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          discount_percentage?: number
          discount_type?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          product_id?: string | null
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_discounts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string
          buying_price: number | null
          category: string | null
          cgst: number | null
          created_at: string | null
          created_by: string | null
          hsn_code: string | null
          id: string
          image_url: string | null
          is_deleted: boolean | null
          is_inclusive: boolean | null
          name: string
          price: number
          price_type: string | null
          product_tax: number | null
          sgst: number | null
          stock_quantity: number | null
          tax_rate: number | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          barcode: string
          buying_price?: number | null
          category?: string | null
          cgst?: number | null
          created_at?: string | null
          created_by?: string | null
          hsn_code?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean | null
          is_inclusive?: boolean | null
          name: string
          price: number
          price_type?: string | null
          product_tax?: number | null
          sgst?: number | null
          stock_quantity?: number | null
          tax_rate?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          barcode?: string
          buying_price?: number | null
          category?: string | null
          cgst?: number | null
          created_at?: string | null
          created_by?: string | null
          hsn_code?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean | null
          is_inclusive?: boolean | null
          name?: string
          price?: number
          price_type?: string | null
          product_tax?: number | null
          sgst?: number | null
          stock_quantity?: number | null
          tax_rate?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          display_name: string | null
          id: string
          role: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          created_at: string | null
          created_by: string
          expected_date: string | null
          id: string
          items_data: Json
          notes: string | null
          purchase_number: string
          received_date: string | null
          status: string
          supplier_name: string | null
          supplier_phone: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          expected_date?: string | null
          id?: string
          items_data?: Json
          notes?: string | null
          purchase_number: string
          received_date?: string | null
          status?: string
          supplier_name?: string | null
          supplier_phone?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          expected_date?: string | null
          id?: string
          items_data?: Json
          notes?: string | null
          purchase_number?: string
          received_date?: string | null
          status?: string
          supplier_name?: string | null
          supplier_phone?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      staff: {
        Row: {
          allowed_modules: string[]
          created_at: string | null
          created_by: string
          display_name: string
          email: string
          id: string
          is_active: boolean | null
          password_hash: string
          show_in_bill: boolean | null
          updated_at: string | null
        }
        Insert: {
          allowed_modules?: string[]
          created_at?: string | null
          created_by: string
          display_name: string
          email: string
          id?: string
          is_active?: boolean | null
          password_hash: string
          show_in_bill?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allowed_modules?: string[]
          created_at?: string | null
          created_by?: string
          display_name?: string
          email?: string
          id?: string
          is_active?: boolean | null
          password_hash?: string
          show_in_bill?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      waiters: {
        Row: {
          created_at: string | null
          created_by: string
          display_name: string
          id: string
          is_active: boolean | null
          password: string
          updated_at: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          display_name: string
          id?: string
          is_active?: boolean | null
          password: string
          updated_at?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          display_name?: string
          id?: string
          is_active?: boolean | null
          password?: string
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
