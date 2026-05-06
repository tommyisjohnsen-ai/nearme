// Hand-written stub of the Supabase-generated types.
// Run `pnpm supabase:types` to regenerate after schema changes.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: "customer" | "vendor" | "admin";
          display_name: string | null;
          phone: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          role?: "customer" | "vendor" | "admin";
          display_name?: string | null;
          phone?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      vendors: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["vendors"]["Insert"]>;
        Relationships: [];
      };
      vendor_sessions: {
        Row: {
          id: string;
          vendor_id: string;
          started_at: string;
          ended_at: string | null;
          last_location: unknown | null; // PostGIS geography
          last_seen_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          started_at?: string;
          ended_at?: string | null;
          last_location?: unknown | null;
          last_seen_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["vendor_sessions"]["Insert"]>;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          customer_id: string;
          vendor_id: string;
          fulfillment: "pickup" | "delivery";
          bun_count: number;
          customer_note: string | null;
          customer_location: unknown | null;
          status:
            | "requested"
            | "accepted"
            | "en_route"
            | "delivered"
            | "cancelled";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          vendor_id: string;
          fulfillment: "pickup" | "delivery";
          bun_count: number;
          customer_note?: string | null;
          customer_location?: unknown | null;
          status?:
            | "requested"
            | "accepted"
            | "en_route"
            | "delivered"
            | "cancelled";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
        Relationships: [];
      };
      order_messages: {
        Row: {
          id: string;
          order_id: string;
          sender_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          sender_id: string;
          body: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["order_messages"]["Insert"]>;
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["push_subscriptions"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      nearby_vendors: {
        Args: { lat: number; lng: number; radius_m: number };
        Returns: Array<{
          vendor_id: string;
          owner_id: string;
          name: string;
          description: string | null;
          session_id: string;
          last_seen_at: string;
          distance_m: number;
          lng: number;
          lat: number;
        }>;
      };
      update_vendor_location: {
        Args: { p_session_id: string; p_lat: number; p_lng: number };
        Returns: undefined;
      };
      transition_order_status: {
        Args: {
          p_order_id: string;
          p_new_status:
            | "requested"
            | "accepted"
            | "en_route"
            | "delivered"
            | "cancelled";
        };
        Returns: Database["public"]["Tables"]["orders"]["Row"];
      };
      end_active_session: {
        Args: { p_vendor_id: string };
        Returns: undefined;
      };
      start_vendor_session: {
        Args: { p_vendor_id: string; p_lat: number; p_lng: number };
        Returns: string;
      };
    };
    Enums: {
      user_role: "customer" | "vendor" | "admin";
      order_status:
        | "requested"
        | "accepted"
        | "en_route"
        | "delivered"
        | "cancelled";
      fulfillment_type: "pickup" | "delivery";
    };
    CompositeTypes: Record<string, never>;
  };
};
