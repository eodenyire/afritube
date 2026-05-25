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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ad_impressions: {
        Row: {
          ad_slot: string
          created_at: string
          creator_id: string
          id: string
          revenue_usd: number
          video_id: string
          viewer_id: string | null
        }
        Insert: {
          ad_slot?: string
          created_at?: string
          creator_id: string
          id?: string
          revenue_usd?: number
          video_id: string
          viewer_id?: string | null
        }
        Update: {
          ad_slot?: string
          created_at?: string
          creator_id?: string
          id?: string
          revenue_usd?: number
          video_id?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_impressions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_tracks: {
        Row: {
          artist_name: string | null
          audio_url: string
          cover_url: string | null
          created_at: string
          description: string | null
          duration: number | null
          genre: string | null
          id: string
          is_published: boolean
          streams: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          artist_name?: string | null
          audio_url: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          genre?: string | null
          id?: string
          is_published?: boolean
          streams?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          artist_name?: string | null
          audio_url?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          genre?: string | null
          id?: string
          is_published?: boolean
          streams?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          category: string | null
          comments_count: number
          content: string
          cover_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_published: boolean
          likes: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          comments_count?: number
          content?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          likes?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          comments_count?: number
          content?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          likes?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      playlist_items: {
        Row: {
          added_at: string
          audio_id: string | null
          id: string
          playlist_id: string
          position: number
          video_id: string | null
        }
        Insert: {
          added_at?: string
          audio_id?: string | null
          id?: string
          playlist_id: string
          position?: number
          video_id?: string | null
        }
        Update: {
          added_at?: string
          audio_id?: string | null
          id?: string
          playlist_id?: string
          position?: number
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playlist_items_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          is_published: boolean
          playlist_type: Database["public"]["Enums"]["playlist_type"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          is_published?: boolean
          playlist_type?: Database["public"]["Enums"]["playlist_type"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          is_published?: boolean
          playlist_type?: Database["public"]["Enums"]["playlist_type"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          amount_usd: number
          created_at: string
          creator_id: string
          id: string
          notes: string | null
          payout_details: Json
          payout_method: string | null
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string
        }
        Insert: {
          amount_usd: number
          created_at?: string
          creator_id: string
          id?: string
          notes?: string | null
          payout_details?: Json
          payout_method?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
        }
        Update: {
          amount_usd?: number
          created_at?: string
          creator_id?: string
          id?: string
          notes?: string | null
          payout_details?: Json
          payout_method?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          is_creator: boolean
          is_monetized: boolean
          subscriber_count: number
          updated_at: string
          user_id: string
          watch_hours: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_creator?: boolean
          is_monetized?: boolean
          subscriber_count?: number
          updated_at?: string
          user_id: string
          watch_hours?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_creator?: boolean
          is_monetized?: boolean
          subscriber_count?: number
          updated_at?: string
          user_id?: string
          watch_hours?: number
        }
        Relationships: []
      }
      recommendation_events: {
        Row: {
          context: Json
          created_at: string
          event_type: Database["public"]["Enums"]["recommendation_event_type"]
          id: string
          user_id: string
          video_id: string | null
        }
        Insert: {
          context?: Json
          created_at?: string
          event_type: Database["public"]["Enums"]["recommendation_event_type"]
          id?: string
          user_id: string
          video_id?: string | null
        }
        Update: {
          context?: Json
          created_at?: string
          event_type?: Database["public"]["Enums"]["recommendation_event_type"]
          id?: string
          user_id?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_events_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          subscriber_id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          subscriber_id: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          subscriber_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_reactions: {
        Row: {
          created_at: string
          id: string
          reaction_type: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_type: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction_type?: string
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          duration: number | null
          id: string
          is_published: boolean
          processing_status: Database["public"]["Enums"]["video_processing_status"]
          publish_at: string | null
          subtitle_url: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
          video_url: string
          visibility: Database["public"]["Enums"]["video_visibility"]
          views: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          is_published?: boolean
          processing_status?: Database["public"]["Enums"]["video_processing_status"]
          publish_at?: string | null
          subtitle_url?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
          video_url: string
          visibility?: Database["public"]["Enums"]["video_visibility"]
          views?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          is_published?: boolean
          processing_status?: Database["public"]["Enums"]["video_processing_status"]
          publish_at?: string | null
          subtitle_url?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          video_url?: string
          visibility?: Database["public"]["Enums"]["video_visibility"]
          views?: number
        }
        Relationships: []
      }
      watch_history: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          video_id: string
          viewer_id: string | null
          watch_seconds: number
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          video_id: string
          viewer_id?: string | null
          watch_seconds?: number
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          video_id?: string
          viewer_id?: string | null
          watch_seconds?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_video_to_playlist: {
        Args: { p_playlist_id: string; p_video_id: string }
        Returns: undefined
      }
      add_watch_time: {
        Args: {
          p_creator_id: string
          p_seconds?: number
          p_video_id: string
          p_viewer_id?: string
        }
        Returns: undefined
      }
      check_monetization_eligibility: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      create_playlist: {
        Args: {
          p_cover_url?: string
          p_description?: string
          p_playlist_type?: Database["public"]["Enums"]["playlist_type"]
          p_title: string
        }
        Returns: string
      }
      disable_creator_ads: { Args: never; Returns: boolean }
      enable_creator_ads: { Args: never; Returns: boolean }
      get_creator_earnings_summary: {
        Args: { p_creator_id?: string }
        Returns: {
          impressions: number
          paid_payout_usd: number
          pending_payout_usd: number
          rpm_usd: number
          this_month_impressions: number
          this_month_revenue_usd: number
          total_revenue_usd: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_streams: { Args: { track_id: string }; Returns: undefined }
      log_ad_impression: {
        Args: {
          p_ad_slot?: string
          p_creator_id: string
          p_revenue_usd?: number
          p_video_id: string
          p_viewer_id?: string
        }
        Returns: boolean
      }
      remove_video_from_playlist: {
        Args: { p_playlist_id: string; p_video_id: string }
        Returns: undefined
      }
      reorder_playlist_items: {
        Args: {
          p_new_position: number
          p_playlist_id: string
          p_video_id: string
        }
        Returns: undefined
      }
      request_payout: {
        Args: {
          p_amount_usd: number
          p_payout_details?: Json
          p_payout_method?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      playlist_type: "album" | "ep" | "compilation" | "custom" | "watch_later"
      payout_status: "pending" | "approved" | "paid" | "rejected"
      recommendation_event_type:
        | "search_query"
        | "search_result_click"
        | "watch_start"
        | "watch_complete"
      video_processing_status: "processing" | "ready" | "failed"
      video_visibility: "public" | "unlisted" | "private"
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
      app_role: ["admin", "moderator", "user"],
      playlist_type: ["album", "ep", "compilation", "custom", "watch_later"],
      payout_status: ["pending", "approved", "paid", "rejected"],
      recommendation_event_type: [
        "search_query",
        "search_result_click",
        "watch_start",
        "watch_complete",
      ],
      video_processing_status: ["processing", "ready", "failed"],
      video_visibility: ["public", "unlisted", "private"],
    },
  },
} as const
