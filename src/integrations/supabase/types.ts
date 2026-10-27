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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      answers: {
        Row: {
          body: string
          created_at: string
          helpful: boolean
          id: string
          like_count: number
          question_id: string
          removed: boolean
          reply_count: number
          spoiler: boolean
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          helpful?: boolean
          id?: string
          like_count?: number
          question_id: string
          removed?: boolean
          reply_count?: number
          spoiler?: boolean
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          helpful?: boolean
          id?: string
          like_count?: number
          question_id?: string
          removed?: boolean
          reply_count?: number
          spoiler?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_items: {
        Row: {
          added_at: string
          collection_id: string
          position: number
          title_id: string
        }
        Insert: {
          added_at?: string
          collection_id: string
          position?: number
          title_id: string
        }
        Update: {
          added_at?: string
          collection_id?: string
          position?: number
          title_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          removed: boolean
          slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          removed?: boolean
          slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          removed?: boolean
          slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      library: {
        Row: {
          created_at: string
          status: string
          title_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          status: string
          title_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          status?: string
          title_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          note: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          note?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          note?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          body: string
          category: Database["public"]["Enums"]["post_category"]
          created_at: string
          episode: number | null
          explanation: string | null
          id: string
          like_count: number
          quote_character: string | null
          removed: boolean
          reply_count: number
          season: number | null
          spoiler: boolean
          title_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          category: Database["public"]["Enums"]["post_category"]
          created_at?: string
          episode?: number | null
          explanation?: string | null
          id?: string
          like_count?: number
          quote_character?: string | null
          removed?: boolean
          reply_count?: number
          season?: number | null
          spoiler?: boolean
          title_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          category?: Database["public"]["Enums"]["post_category"]
          created_at?: string
          episode?: number | null
          explanation?: string | null
          id?: string
          like_count?: number
          quote_character?: string | null
          removed?: boolean
          reply_count?: number
          season?: number | null
          spoiler?: boolean
          title_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string
          created_at: string
          display_name: string
          id: string
          status: Database["public"]["Enums"]["account_status"]
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string
          created_at?: string
          display_name?: string
          id: string
          status?: Database["public"]["Enums"]["account_status"]
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string
          created_at?: string
          display_name?: string
          id?: string
          status?: Database["public"]["Enums"]["account_status"]
          username?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          answer_count: number
          created_at: string
          details: string | null
          episode: number | null
          id: string
          like_count: number
          question: string
          removed: boolean
          season: number | null
          spoiler: boolean
          title_id: string
          user_id: string
        }
        Insert: {
          answer_count?: number
          created_at?: string
          details?: string | null
          episode?: number | null
          id?: string
          like_count?: number
          question: string
          removed?: boolean
          season?: number | null
          spoiler?: boolean
          title_id: string
          user_id: string
        }
        Update: {
          answer_count?: number
          created_at?: string
          details?: string | null
          episode?: number | null
          id?: string
          like_count?: number
          question?: string
          removed?: boolean
          season?: number | null
          spoiler?: boolean
          title_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      replies: {
        Row: {
          body: string
          created_at: string
          id: string
          parent_id: string
          parent_type: string
          removed: boolean
          spoiler: boolean
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          parent_id: string
          parent_type: string
          removed?: boolean
          spoiler?: boolean
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          parent_id?: string
          parent_type?: string
          removed?: boolean
          spoiler?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "replies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reporter_id: string
          status: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          status?: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          body: string
          created_at: string
          heading: string | null
          id: string
          like_count: number
          removed: boolean
          reply_count: number
          spoiler: boolean
          title_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          heading?: string | null
          id?: string
          like_count?: number
          removed?: boolean
          reply_count?: number
          spoiler?: boolean
          title_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          heading?: string | null
          id?: string
          like_count?: number
          removed?: boolean
          reply_count?: number
          spoiler?: boolean
          title_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_collections: {
        Row: {
          collection_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_collections_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_collections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      titles: {
        Row: {
          genres: string[]
          id: string
          kind: string
          poster_path: string | null
          slug: string
          title: string
          tmdb_id: number
          updated_at: string
          year: number | null
        }
        Insert: {
          genres?: string[]
          id: string
          kind: string
          poster_path?: string | null
          slug: string
          title: string
          tmdb_id: number
          updated_at?: string
          year?: number | null
        }
        Update: {
          genres?: string[]
          id?: string
          kind?: string
          poster_path?: string | null
          slug?: string
          title?: string
          tmdb_id?: number
          updated_at?: string
          year?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cache_title: {
        Args: {
          _genres: string[]
          _id: string
          _kind: string
          _poster_path: string
          _slug: string
          _title: string
          _tmdb_id: number
          _year: number
        }
        Returns: undefined
      }
      can_write: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_helpful: {
        Args: { _answer_id: string; _value: boolean }
        Returns: undefined
      }
      owns_collection: { Args: { _cid: string }; Returns: boolean }
      search_collections: {
        Args: { q: string }
        Returns: {
          created_at: string
          description: string | null
          id: string
          name: string
          removed: boolean
          slug: string
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "collections"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      account_status: "active" | "restricted" | "suspended" | "banned"
      app_role: "admin" | "moderator" | "user"
      post_category: "lesson" | "quote" | "moment" | "trailer_thought"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      account_status: ["active", "restricted", "suspended", "banned"],
      app_role: ["admin", "moderator", "user"],
      post_category: ["lesson", "quote", "moment", "trailer_thought"],
    },
  },
} as const
