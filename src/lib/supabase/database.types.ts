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
      families: {
        Row: {
          id: string;
          name: string;
          invite_code: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          invite_code?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          invite_code?: string;
          created_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          family_id: string | null;
          role: 'caregiver' | 'patient';
          display_name: string;
          created_at: string;
        };
        Insert: {
          id: string;
          family_id?: string | null;
          role: 'caregiver' | 'patient';
          display_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string | null;
          role?: 'caregiver' | 'patient';
          display_name?: string;
          created_at?: string;
        };
      };
      patients: {
        Row: {
          id: string;
          family_id: string;
          name: string;
          photo_url: string | null;
          home_location_text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          name: string;
          photo_url?: string | null;
          home_location_text?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          name?: string;
          photo_url?: string | null;
          home_location_text?: string;
          created_at?: string;
        };
      };
      people: {
        Row: {
          id: string;
          family_id: string;
          name: string;
          relationship: string;
          photo_url: string | null;
          notes: string | null;
          voice_note_url: string | null;
          pinned: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          name: string;
          relationship: string;
          photo_url?: string | null;
          notes?: string | null;
          voice_note_url?: string | null;
          pinned?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          name?: string;
          relationship?: string;
          photo_url?: string | null;
          notes?: string | null;
          voice_note_url?: string | null;
          pinned?: boolean;
          created_at?: string;
        };
      };
      routines: {
        Row: {
          id: string;
          family_id: string;
          title: string;
          time_of_day: string;
          days_of_week: string[];
          icon_url: string | null;
          instructions: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          title: string;
          time_of_day: string;
          days_of_week?: string[];
          icon_url?: string | null;
          instructions?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          title?: string;
          time_of_day?: string;
          days_of_week?: string[];
          icon_url?: string | null;
          instructions?: string | null;
          created_at?: string;
        };
      };
      reminders: {
        Row: {
          id: string;
          family_id: string;
          type: 'medication' | 'activity' | 'appointment';
          title: string;
          time: string;
          repeat_rule: string | null;
          photo_url: string | null;
          last_confirmed_at: string | null;
          requires_confirmation: boolean;
          missed_window_minutes: number;
          snooze_count: number;
          status: 'pending' | 'snoozed' | 'done' | 'missed';
          created_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          type: 'medication' | 'activity' | 'appointment';
          title: string;
          time: string;
          repeat_rule?: string | null;
          photo_url?: string | null;
          last_confirmed_at?: string | null;
          requires_confirmation?: boolean;
          missed_window_minutes?: number;
          snooze_count?: number;
          status?: 'pending' | 'snoozed' | 'done' | 'missed';
          created_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          type?: 'medication' | 'activity' | 'appointment';
          title?: string;
          time?: string;
          repeat_rule?: string | null;
          photo_url?: string | null;
          last_confirmed_at?: string | null;
          requires_confirmation?: boolean;
          missed_window_minutes?: number;
          snooze_count?: number;
          status?: 'pending' | 'snoozed' | 'done' | 'missed';
          created_at?: string;
        };
      };
      reminiscence_items: {
        Row: {
          id: string;
          family_id: string;
          kind: 'photo' | 'music' | 'memory';
          title: string;
          media_url: string | null;
          era_year: number | null;
          description: string | null;
          prompt: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          kind: 'photo' | 'music' | 'memory';
          title: string;
          media_url?: string | null;
          era_year?: number | null;
          description?: string | null;
          prompt?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          kind?: 'photo' | 'music' | 'memory';
          title?: string;
          media_url?: string | null;
          era_year?: number | null;
          description?: string | null;
          prompt?: string | null;
          created_at?: string;
        };
      };
      events_log: {
        Row: {
          id: string;
          family_id: string;
          type: string;
          detail: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          type: string;
          detail?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          type?: string;
          detail?: Json | null;
          created_at?: string;
        };
      };
      emergency_contacts: {
        Row: {
          id: string;
          family_id: string;
          name: string;
          relationship: string;
          phone: string;
          photo_url: string | null;
          priority: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          name: string;
          relationship: string;
          phone: string;
          photo_url?: string | null;
          priority?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          name?: string;
          relationship?: string;
          phone?: string;
          photo_url?: string | null;
          priority?: number;
          created_at?: string;
        };
      };
      location_settings: {
        Row: {
          id: string;
          family_id: string;
          sharing_enabled: boolean;
          home_lat: number | null;
          home_lng: number | null;
          radius_m: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          sharing_enabled?: boolean;
          home_lat?: number | null;
          home_lng?: number | null;
          radius_m?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          sharing_enabled?: boolean;
          home_lat?: number | null;
          home_lng?: number | null;
          radius_m?: number;
          updated_at?: string;
        };
      };
      location_pings: {
        Row: {
          id: string;
          family_id: string;
          lat: number;
          lng: number;
          accuracy: number | null;
          inside_zone: boolean | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          lat: number;
          lng: number;
          accuracy?: number | null;
          inside_zone?: boolean | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          lat?: number;
          lng?: number;
          accuracy?: number | null;
          inside_zone?: boolean | null;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          family_id: string;
          type: 'reminder_done' | 'reminder_missed' | 'sos' | 'left_zone' | 'inactivity';
          detail: Json | null;
          seen: boolean;
          created_at: string;
          // Wave 1 — alert intelligence (migration 006)
          severity: 'low' | 'medium' | 'high' | 'critical';
          status: 'new' | 'acknowledged' | 'resolved';
          acknowledged_at: string | null;
          acknowledged_by: string | null;
        };
        Insert: {
          id?: string;
          family_id: string;
          type: 'reminder_done' | 'reminder_missed' | 'sos' | 'left_zone' | 'inactivity';
          detail?: Json | null;
          seen?: boolean;
          created_at?: string;
          severity?: 'low' | 'medium' | 'high' | 'critical';
          status?: 'new' | 'acknowledged' | 'resolved';
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
        };
        Update: {
          id?: string;
          family_id?: string;
          type?: 'reminder_done' | 'reminder_missed' | 'sos' | 'left_zone' | 'inactivity';
          detail?: Json | null;
          seen?: boolean;
          created_at?: string;
          severity?: 'low' | 'medium' | 'high' | 'critical';
          status?: 'new' | 'acknowledged' | 'resolved';
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
        };
      };
    };
      mood_checkins: {
        Row: {
          id:         string;
          family_id:  string;
          mood:       'happy' | 'okay' | 'sad' | 'anxious';
          note:       string | null;
          created_at: string;
        };
        Insert: {
          id?:        string;
          family_id:  string;
          mood:       'happy' | 'okay' | 'sad' | 'anxious';
          note?:      string | null;
          created_at?: string;
        };
        Update: {
          id?:        string;
          family_id?: string;
          mood?:      'happy' | 'okay' | 'sad' | 'anxious';
          note?:      string | null;
          created_at?: string;
        };
      };
      cognitive_activities: {
        Row: {
          id:            string;
          family_id:     string;
          activity_type: string;
          score:         number | null;
          total:         number | null;
          result:        Json | null;
          created_at:    string;
        };
        Insert: {
          id?:           string;
          family_id:     string;
          activity_type: string;
          score?:        number | null;
          total?:        number | null;
          result?:       Json | null;
          created_at?:   string;
        };
        Update: {
          id?:           string;
          family_id?:    string;
          activity_type?: string;
          score?:        number | null;
          total?:        number | null;
          result?:       Json | null;
          created_at?:   string;
        };
      };
      patient_medical_info: {
        Row: {
          id:               string;
          family_id:        string;
          allergies:        string | null;
          medications:      string | null;
          conditions:       string | null;
          notes:            string | null;
          updated_at:       string;
          // Emergency card (migration 010)
          public_token:     string | null;
          is_public:        boolean;
          show_name:        boolean;
          show_photo:       boolean;
          show_allergies:   boolean;
          show_medications: boolean;
          show_conditions:  boolean;
          show_contacts:    boolean;
        };
        Insert: {
          id?:               string;
          family_id:         string;
          allergies?:        string | null;
          medications?:      string | null;
          conditions?:       string | null;
          notes?:            string | null;
          updated_at?:       string;
          public_token?:     string | null;
          is_public?:        boolean;
          show_name?:        boolean;
          show_photo?:       boolean;
          show_allergies?:   boolean;
          show_medications?: boolean;
          show_conditions?:  boolean;
          show_contacts?:    boolean;
        };
        Update: {
          id?:               string;
          family_id?:        string;
          allergies?:        string | null;
          medications?:      string | null;
          conditions?:       string | null;
          notes?:            string | null;
          updated_at?:       string;
          public_token?:     string | null;
          is_public?:        boolean;
          show_name?:        boolean;
          show_photo?:       boolean;
          show_allergies?:   boolean;
          show_medications?: boolean;
          show_conditions?:  boolean;
          show_contacts?:    boolean;
        };
      };
      cognitive_reports: {
        Row: {
          id:            string;
          family_id:     string;
          period_start:  string;
          period_end:    string;
          days:          number;
          metrics_json:  Json;
          summary_text:  string;
          ai_generated:  boolean;
          created_at:    string;
        };
        Insert: {
          id?:           string;
          family_id:     string;
          period_start:  string;
          period_end:    string;
          days?:         number;
          metrics_json?: Json;
          summary_text:  string;
          ai_generated?: boolean;
          created_at?:   string;
        };
        Update: {
          id?:           string;
          family_id?:    string;
          period_start?: string;
          period_end?:   string;
          days?:         number;
          metrics_json?: Json;
          summary_text?: string;
          ai_generated?: boolean;
          created_at?:   string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_my_family_id: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: Record<string, never>;
  };
};

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
