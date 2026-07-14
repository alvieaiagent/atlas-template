import type {
  AddedVia,
  MarkedStatus,
  Purpose,
  Source,
} from "@/lib/types";

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
      categories: {
        Row: {
          id: string;
          name: string;
          color: string;
          keywords: string[];
          accounts: string[];
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          color?: string;
          keywords?: string[];
          accounts?: string[];
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          color?: string;
          keywords?: string[];
          accounts?: string[];
          sort_order?: number;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          source: Source;
          external_id: string;
          author_handle: string;
          author_name: string;
          verified: boolean;
          text: string;
          media: Json;
          engagement: Json;
          posted_at: string;
          category_ids: string[];
          fetched_at: string;
          url: string | null;
          added_via: AddedVia;
          purpose: Purpose;
        };
        Insert: {
          id?: string;
          source: Source;
          external_id: string;
          author_handle: string;
          author_name: string;
          verified?: boolean;
          text: string;
          media?: Json;
          engagement?: Json;
          posted_at: string;
          category_ids?: string[];
          fetched_at?: string;
          url?: string | null;
          added_via?: AddedVia;
          purpose?: Purpose;
        };
        Update: {
          author_handle?: string;
          author_name?: string;
          verified?: boolean;
          text?: string;
          media?: Json;
          engagement?: Json;
          posted_at?: string;
          category_ids?: string[];
          fetched_at?: string;
          url?: string | null;
          added_via?: AddedVia;
          purpose?: Purpose;
        };
        Relationships: [];
      };
      marked_posts: {
        Row: {
          post_id: string;
          marked_at: string;
          status: MarkedStatus;
          notes: string | null;
        };
        Insert: {
          post_id: string;
          marked_at?: string;
          status?: MarkedStatus;
          notes?: string | null;
        };
        Update: {
          status?: MarkedStatus;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "marked_posts_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: true;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      scrape_cursors: {
        Row: {
          source: Source;
          category_id: string;
          last_cursor: string | null;
          last_run_at: string | null;
        };
        Insert: {
          source: Source;
          category_id: string;
          last_cursor?: string | null;
          last_run_at?: string | null;
        };
        Update: {
          last_cursor?: string | null;
          last_run_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "scrape_cursors_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      post_scripts: {
        Row: {
          post_id: string;
          caption: string | null;
          transcript: string | null;
          model: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          post_id: string;
          caption?: string | null;
          transcript?: string | null;
          model?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          caption?: string | null;
          transcript?: string | null;
          model?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_scripts_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: true;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      post_outputs: {
        Row: {
          post_id: string;
          kind: string;
          content: string;
          model: string | null;
          updated_at: string;
        };
        Insert: {
          post_id: string;
          kind: string;
          content: string;
          model?: string | null;
          updated_at?: string;
        };
        Update: {
          content?: string;
          model?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_outputs_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      competitors: {
        Row: {
          source: Source;
          handle: string;
          name: string | null;
          added_at: string;
        };
        Insert: {
          source: Source;
          handle: string;
          name?: string | null;
          added_at?: string;
        };
        Update: {
          name?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
