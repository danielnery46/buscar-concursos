export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      job_openings: {
        Row: {
          city: string | null
          deadline_date: string | null
          deadline_formatted: string | null
          deadline_text: string | null
          education_level_text: string | null
          education_levels: string[] | null
          effective_city: string | null
          last_run_id: string | null
          link: string
          location: string | null
          logo_path: string | null
          max_salary_numeric: number | null
          mentioned_states: string[] | null
          min_salary_numeric: number | null
          normalized_effective_city: string | null
          organization: string | null
          parsed_roles: string[] | null
          parsed_salary_text: string | null
          parsed_vacancies_text: string | null
          salary_text: string | null
          searchable_text: string | null
          source: string | null
          title: string | null
          type: string | null
          vacancies_numeric: number | null
        }
        Insert: {
          city?: string | null
          deadline_date?: string | null
          deadline_formatted?: string | null
          deadline_text?: string | null
          education_level_text?: string | null
          education_levels?: string[] | null
          effective_city?: string | null
          last_run_id?: string | null
          link: string
          location?: string | null
          logo_path?: string | null
          max_salary_numeric?: number | null
          mentioned_states?: string[] | null
          min_salary_numeric?: number | null
          normalized_effective_city?: string | null
          organization?: string | null
          parsed_roles?: string[] | null
          parsed_salary_text?: string | null
          parsed_vacancies_text?: string | null
          salary_text?: string | null
          searchable_text?: string | null
          source?: string | null
          title?: string | null
          type?: string | null
          vacancies_numeric?: number | null
        }
        Update: {
          city?: string | null
          deadline_date?: string | null
          deadline_formatted?: string | null
          deadline_text?: string | null
          education_level_text?: string | null
          education_levels?: string[] | null
          effective_city?: string | null
          last_run_id?: string | null
          link?: string
          location?: string | null
          logo_path?: string | null
          max_salary_numeric?: number | null
          mentioned_states?: string[] | null
          min_salary_numeric?: number | null
          normalized_effective_city?: string | null
          organization?: string | null
          parsed_roles?: string[] | null
          parsed_salary_text?: string | null
          parsed_vacancies_text?: string | null
          salary_text?: string | null
          searchable_text?: string | null
          source?: string | null
          title?: string | null
          type?: string | null
          vacancies_numeric?: number | null
        }
        Relationships: []
      }
      news_articles: {
        Row: {
          id: number
          link: string
          mentioned_states: string[] | null
          normalized_title: string | null
          publication_date: string | null
          source: string | null
          title: string | null
        }
        Insert: {
          id?: number
          link: string
          mentioned_states?: string[] | null
          normalized_title?: string | null
          publication_date?: string | null
          source?: string | null
          title?: string | null
        }
        Update: {
          id?: number
          link?: string
          mentioned_states?: string[] | null
          normalized_title?: string | null
          publication_date?: string | null
          source?: string | null
          title?: string | null
        }
        Relationships: []
      }
      predicted_openings: {
        Row: {
          id: number
          link: string
          mentioned_states: string[] | null
          normalized_title: string | null
          publication_date: string | null
          source: string | null
          title: string | null
        }
        Insert: {
          id?: number
          link: string
          mentioned_states?: string[] | null
          normalized_title?: string | null
          publication_date?: string | null
          source?: string | null
          title?: string | null
        }
        Update: {
          id?: number
          link?: string
          mentioned_states?: string[] | null
          normalized_title?: string | null
          publication_date?: string | null
          source?: string | null
          title?: string | null
        }
        Relationships: []
      }
      user_data: {
        Row: {
          accessibility_settings: Json | null
          default_news_filter: Json | null
          default_predicted_filter: Json | null
          default_search: Json | null
          favorite_news_filters: Json | null
          favorite_predicted_filters: Json | null
          favorite_searches: Json | null
          id: string
          rota_cidade: string | null
          theme: string | null
        }
        Insert: {
          accessibility_settings?: Json | null
          default_news_filter?: Json | null
          default_predicted_filter?: Json | null
          default_search?: Json | null
          favorite_news_filters?: Json | null
          favorite_predicted_filters?: Json | null
          favorite_searches?: Json | null
          id: string
          rota_cidade?: string | null
          theme?: string | null
        }
        Update: {
          accessibility_settings?: Json | null
          default_news_filter?: Json | null
          default_predicted_filter?: Json | null
          default_search?: Json | null
          favorite_news_filters?: Json | null
          favorite_predicted_filters?: Json | null
          favorite_searches?: Json | null
          id?: string
          rota_cidade?: string | null
          theme?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_data_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
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
