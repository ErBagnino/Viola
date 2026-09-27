
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "activity_events": {
                  Row: {
                    "created_at": string,"id": string,"payload": NonNullable<Json>,"type": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"payload"?: NonNullable<Json>,"type": string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"payload"?: NonNullable<Json>,"type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"adam_requests": {
                  Row: {
                    "closed_at": string | null,"created_at": string,"id": string,"message": string | null,"notification_ok": boolean,"notified_channels": (string)[],"responded_at": string | null,"response": string | null,"seen_at": string | null,"status": string,"user_id": string
                  }
                  Insert: {
                    "closed_at"?: string | null,"created_at"?: string,"id"?: string,"message"?: string | null,"notification_ok"?: boolean,"notified_channels"?: (string)[],"responded_at"?: string | null,"response"?: string | null,"seen_at"?: string | null,"status"?: string,"user_id"?: string
                  }
                  Update: {
                    "closed_at"?: string | null,"created_at"?: string,"id"?: string,"message"?: string | null,"notification_ok"?: boolean,"notified_channels"?: (string)[],"responded_at"?: string | null,"response"?: string | null,"seen_at"?: string | null,"status"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"admin_audit_logs": {
                  Row: {
                    "action": string,"admin_id": string | null,"after": Json | null,"before": Json | null,"created_at": string,"id": string,"target_id": string | null,"target_table": string | null
                  }
                  Insert: {
                    "action": string,"admin_id"?: string | null,"after"?: Json | null,"before"?: Json | null,"created_at"?: string,"id"?: string,"target_id"?: string | null,"target_table"?: string | null
                  }
                  Update: {
                    "action"?: string,"admin_id"?: string | null,"after"?: Json | null,"before"?: Json | null,"created_at"?: string,"id"?: string,"target_id"?: string | null,"target_table"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"ai_conversations": {
                  Row: {
                    "created_at": string,"id": string,"mode": string,"scope": string,"title": string | null,"updated_at": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"mode"?: string,"scope"?: string,"title"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"mode"?: string,"scope"?: string,"title"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"ai_memory": {
                  Row: {
                    "category": string,"created_at": string,"enabled": boolean,"id": string,"key": string,"updated_at": string,"value": string,"visible_to_viola": boolean
                  }
                  Insert: {
                    "category"?: string,"created_at"?: string,"enabled"?: boolean,"id"?: string,"key": string,"updated_at"?: string,"value": string,"visible_to_viola"?: boolean
                  }
                  Update: {
                    "category"?: string,"created_at"?: string,"enabled"?: boolean,"id"?: string,"key"?: string,"updated_at"?: string,"value"?: string,"visible_to_viola"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"ai_messages": {
                  Row: {
                    "actions": NonNullable<Json>,"content": string,"conversation_id": string,"created_at": string,"id": string,"input_tokens": number | null,"output_tokens": number | null,"role": string,"status": string,"user_id": string
                  }
                  Insert: {
                    "actions"?: NonNullable<Json>,"content"?: string,"conversation_id": string,"created_at"?: string,"id"?: string,"input_tokens"?: number | null,"output_tokens"?: number | null,"role": string,"status"?: string,"user_id"?: string
                  }
                  Update: {
                    "actions"?: NonNullable<Json>,"content"?: string,"conversation_id"?: string,"created_at"?: string,"id"?: string,"input_tokens"?: number | null,"output_tokens"?: number | null,"role"?: string,"status"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_messages_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "ai_conversations"
      referencedColumns: ["id"]
    }
                  ]
                },"ai_tool_logs": {
                  Row: {
                    "args": NonNullable<Json>,"confirmed_at": string | null,"conversation_id": string | null,"created_at": string,"id": string,"result": Json | null,"scope": string,"status": string,"success": boolean,"tool": string,"user_id": string | null
                  }
                  Insert: {
                    "args"?: NonNullable<Json>,"confirmed_at"?: string | null,"conversation_id"?: string | null,"created_at"?: string,"id"?: string,"result"?: Json | null,"scope": string,"status"?: string,"success"?: boolean,"tool": string,"user_id"?: string | null
                  }
                  Update: {
                    "args"?: NonNullable<Json>,"confirmed_at"?: string | null,"conversation_id"?: string | null,"created_at"?: string,"id"?: string,"result"?: Json | null,"scope"?: string,"status"?: string,"success"?: boolean,"tool"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_tool_logs_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "ai_conversations"
      referencedColumns: ["id"]
    }
                  ]
                },"ai_usage_daily": {
                  Row: {
                    "day": string,"input_tokens": number,"output_tokens": number,"requests": number,"scope": string,"user_id": string
                  }
                  Insert: {
                    "day": string,"input_tokens"?: number,"output_tokens"?: number,"requests"?: number,"scope": string,"user_id": string
                  }
                  Update: {
                    "day"?: string,"input_tokens"?: number,"output_tokens"?: number,"requests"?: number,"scope"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"app_settings": {
                  Row: {
                    "is_public": boolean,"key": string,"updated_at": string,"updated_by": string | null,"value": NonNullable<Json>
                  }
                  Insert: {
                    "is_public"?: boolean,"key": string,"updated_at"?: string,"updated_by"?: string | null,"value"?: NonNullable<Json>
                  }
                  Update: {
                    "is_public"?: boolean,"key"?: string,"updated_at"?: string,"updated_by"?: string | null,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"audio_items": {
                  Row: {
                    "category": string,"created_at": string,"description": string | null,"id": string,"is_published": boolean,"media_id": string | null,"position": number,"title": string,"updated_at": string
                  }
                  Insert: {
                    "category"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"is_published"?: boolean,"media_id"?: string | null,"position"?: number,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "category"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"is_published"?: boolean,"media_id"?: string | null,"position"?: number,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "audio_items_media_id_fkey"
      columns: ["media_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    }
                  ]
                },"breathing_media": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"media_id": string | null,"position": number,"preset_id": string | null,"text": string | null,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"media_id"?: string | null,"position"?: number,"preset_id"?: string | null,"text"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"media_id"?: string | null,"position"?: number,"preset_id"?: string | null,"text"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "breathing_media_media_id_fkey"
      columns: ["media_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "breathing_media_preset_id_fkey"
      columns: ["preset_id"]
isOneToOne: false
      referencedRelation: "breathing_presets"
      referencedColumns: ["id"]
    }
                  ]
                },"breathing_presets": {
                  Row: {
                    "audio_id": string | null,"created_at": string,"description": string | null,"exhale_seconds": number,"hold_after_exhale_seconds": number,"hold_seconds": number,"id": string,"inhale_seconds": number,"is_active": boolean,"is_default": boolean,"name": string,"photo_mode": string,"position": number,"rounds": number | null,"show_photos": boolean,"texts": (string)[],"updated_at": string,"visual": string
                  }
                  Insert: {
                    "audio_id"?: string | null,"created_at"?: string,"description"?: string | null,"exhale_seconds"?: number,"hold_after_exhale_seconds"?: number,"hold_seconds"?: number,"id"?: string,"inhale_seconds"?: number,"is_active"?: boolean,"is_default"?: boolean,"name": string,"photo_mode"?: string,"position"?: number,"rounds"?: number | null,"show_photos"?: boolean,"texts"?: (string)[],"updated_at"?: string,"visual"?: string
                  }
                  Update: {
                    "audio_id"?: string | null,"created_at"?: string,"description"?: string | null,"exhale_seconds"?: number,"hold_after_exhale_seconds"?: number,"hold_seconds"?: number,"id"?: string,"inhale_seconds"?: number,"is_active"?: boolean,"is_default"?: boolean,"name"?: string,"photo_mode"?: string,"position"?: number,"rounds"?: number | null,"show_photos"?: boolean,"texts"?: (string)[],"updated_at"?: string,"visual"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "breathing_presets_audio_id_fkey"
      columns: ["audio_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    }
                  ]
                },"comfort_actions": {
                  Row: {
                    "category": string,"created_at": string,"cta_action": string,"cta_label": string | null,"cta_url": string | null,"duration_seconds": number | null,"icon": string | null,"id": string,"is_active": boolean,"media_id": string | null,"sound_id": string | null,"text": string,"title": string,"updated_at": string,"weight": number
                  }
                  Insert: {
                    "category"?: string,"created_at"?: string,"cta_action"?: string,"cta_label"?: string | null,"cta_url"?: string | null,"duration_seconds"?: number | null,"icon"?: string | null,"id"?: string,"is_active"?: boolean,"media_id"?: string | null,"sound_id"?: string | null,"text"?: string,"title": string,"updated_at"?: string,"weight"?: number
                  }
                  Update: {
                    "category"?: string,"created_at"?: string,"cta_action"?: string,"cta_label"?: string | null,"cta_url"?: string | null,"duration_seconds"?: number | null,"icon"?: string | null,"id"?: string,"is_active"?: boolean,"media_id"?: string | null,"sound_id"?: string | null,"text"?: string,"title"?: string,"updated_at"?: string,"weight"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "comfort_actions_media_id_fkey"
      columns: ["media_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comfort_actions_sound_id_fkey"
      columns: ["sound_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    }
                  ]
                },"countdowns": {
                  Row: {
                    "created_at": string,"description": string | null,"icon": string | null,"id": string,"is_published": boolean,"kind": string,"media_id": string | null,"position": number,"recurring_yearly": boolean,"show_on_home": boolean,"target_at": string,"title": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"icon"?: string | null,"id"?: string,"is_published"?: boolean,"kind"?: string,"media_id"?: string | null,"position"?: number,"recurring_yearly"?: boolean,"show_on_home"?: boolean,"target_at": string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"icon"?: string | null,"id"?: string,"is_published"?: boolean,"kind"?: string,"media_id"?: string | null,"position"?: number,"recurring_yearly"?: boolean,"show_on_home"?: boolean,"target_at"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "countdowns_media_id_fkey"
      columns: ["media_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    }
                  ]
                },"daily_surprises": {
                  Row: {
                    "action": string,"body": string | null,"created_at": string,"id": string,"is_published": boolean,"kind": string,"media_id": string | null,"scheduled_on": string | null,"title": string,"updated_at": string,"weight": number
                  }
                  Insert: {
                    "action"?: string,"body"?: string | null,"created_at"?: string,"id"?: string,"is_published"?: boolean,"kind"?: string,"media_id"?: string | null,"scheduled_on"?: string | null,"title": string,"updated_at"?: string,"weight"?: number
                  }
                  Update: {
                    "action"?: string,"body"?: string | null,"created_at"?: string,"id"?: string,"is_published"?: boolean,"kind"?: string,"media_id"?: string | null,"scheduled_on"?: string | null,"title"?: string,"updated_at"?: string,"weight"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "daily_surprises_media_id_fkey"
      columns: ["media_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    }
                  ]
                },"dedications": {
                  Row: {
                    "audio_id": string | null,"body": string,"category": string,"created_at": string,"id": string,"is_published": boolean,"media_id": string | null,"pinned": boolean,"position": number,"publish_at": string | null,"signature": string | null,"title": string,"updated_at": string
                  }
                  Insert: {
                    "audio_id"?: string | null,"body"?: string,"category"?: string,"created_at"?: string,"id"?: string,"is_published"?: boolean,"media_id"?: string | null,"pinned"?: boolean,"position"?: number,"publish_at"?: string | null,"signature"?: string | null,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "audio_id"?: string | null,"body"?: string,"category"?: string,"created_at"?: string,"id"?: string,"is_published"?: boolean,"media_id"?: string | null,"pinned"?: boolean,"position"?: number,"publish_at"?: string | null,"signature"?: string | null,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "dedications_audio_id_fkey"
      columns: ["audio_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dedications_media_id_fkey"
      columns: ["media_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    }
                  ]
                },"grounding_exercises": {
                  Row: {
                    "created_at": string,"description": string | null,"end_text": string | null,"icon": string | null,"id": string,"is_active": boolean,"position": number,"slug": string,"steps": NonNullable<Json>,"title": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"end_text"?: string | null,"icon"?: string | null,"id"?: string,"is_active"?: boolean,"position"?: number,"slug": string,"steps"?: NonNullable<Json>,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"end_text"?: string | null,"icon"?: string | null,"id"?: string,"is_active"?: boolean,"position"?: number,"slug"?: string,"steps"?: NonNullable<Json>,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"hearts": {
                  Row: {
                    "created_at": string,"from_user": string,"id": string,"seen_at": string | null
                  }
                  Insert: {
                    "created_at"?: string,"from_user"?: string,"id"?: string,"seen_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"from_user"?: string,"id"?: string,"seen_at"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"home_modules": {
                  Row: {
                    "action": string | null,"color": string | null,"created_at": string,"icon": string | null,"id": string,"is_enabled": boolean,"position": number,"size": string,"subtitle": string | null,"title": string,"type": string,"updated_at": string,"url": string | null,"widget": string | null
                  }
                  Insert: {
                    "action"?: string | null,"color"?: string | null,"created_at"?: string,"icon"?: string | null,"id"?: string,"is_enabled"?: boolean,"position"?: number,"size"?: string,"subtitle"?: string | null,"title": string,"type"?: string,"updated_at"?: string,"url"?: string | null,"widget"?: string | null
                  }
                  Update: {
                    "action"?: string | null,"color"?: string | null,"created_at"?: string,"icon"?: string | null,"id"?: string,"is_enabled"?: boolean,"position"?: number,"size"?: string,"subtitle"?: string | null,"title"?: string,"type"?: string,"updated_at"?: string,"url"?: string | null,"widget"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"journal_entries": {
                  Row: {
                    "body": string,"created_at": string,"id": string,"mood": number | null,"title": string | null,"updated_at": string,"user_id": string,"visibility": string
                  }
                  Insert: {
                    "body": string,"created_at"?: string,"id"?: string,"mood"?: number | null,"title"?: string | null,"updated_at"?: string,"user_id"?: string,"visibility"?: string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"id"?: string,"mood"?: number | null,"title"?: string | null,"updated_at"?: string,"user_id"?: string,"visibility"?: string
                  }
                  Relationships: [
                    
                  ]
                },"media": {
                  Row: {
                    "ai_avatar_enabled": boolean,"breathing_enabled": boolean,"bucket": string,"caption": string | null,"category": string | null,"contexts": (string)[],"created_at": string,"created_by": string | null,"duration_seconds": number | null,"featured": boolean,"height": number | null,"id": string,"include_in_random": boolean,"kind": string,"mime": string,"path": string,"size_bytes": number,"tags": (string)[],"taken_on": string | null,"thumb_path": string | null,"title": string | null,"updated_at": string,"visibility": string,"width": number | null
                  }
                  Insert: {
                    "ai_avatar_enabled"?: boolean,"breathing_enabled"?: boolean,"bucket"?: string,"caption"?: string | null,"category"?: string | null,"contexts"?: (string)[],"created_at"?: string,"created_by"?: string | null,"duration_seconds"?: number | null,"featured"?: boolean,"height"?: number | null,"id"?: string,"include_in_random"?: boolean,"kind"?: string,"mime": string,"path": string,"size_bytes"?: number,"tags"?: (string)[],"taken_on"?: string | null,"thumb_path"?: string | null,"title"?: string | null,"updated_at"?: string,"visibility"?: string,"width"?: number | null
                  }
                  Update: {
                    "ai_avatar_enabled"?: boolean,"breathing_enabled"?: boolean,"bucket"?: string,"caption"?: string | null,"category"?: string | null,"contexts"?: (string)[],"created_at"?: string,"created_by"?: string | null,"duration_seconds"?: number | null,"featured"?: boolean,"height"?: number | null,"id"?: string,"include_in_random"?: boolean,"kind"?: string,"mime"?: string,"path"?: string,"size_bytes"?: number,"tags"?: (string)[],"taken_on"?: string | null,"thumb_path"?: string | null,"title"?: string | null,"updated_at"?: string,"visibility"?: string,"width"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"memories": {
                  Row: {
                    "body": string,"created_at": string,"happened_on": string | null,"id": string,"is_important": boolean,"is_published": boolean,"kind": string,"media_id": string | null,"place": string | null,"position": number,"title": string,"updated_at": string
                  }
                  Insert: {
                    "body"?: string,"created_at"?: string,"happened_on"?: string | null,"id"?: string,"is_important"?: boolean,"is_published"?: boolean,"kind"?: string,"media_id"?: string | null,"place"?: string | null,"position"?: number,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"happened_on"?: string | null,"id"?: string,"is_important"?: boolean,"is_published"?: boolean,"kind"?: string,"media_id"?: string | null,"place"?: string | null,"position"?: number,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "memories_media_id_fkey"
      columns: ["media_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    }
                  ]
                },"messages": {
                  Row: {
                    "body": string,"category": string,"created_at": string,"id": string,"is_private": boolean,"read_at": string | null,"reply": string | null,"responded_at": string | null,"sender_id": string
                  }
                  Insert: {
                    "body": string,"category"?: string,"created_at"?: string,"id"?: string,"is_private"?: boolean,"read_at"?: string | null,"reply"?: string | null,"responded_at"?: string | null,"sender_id"?: string
                  }
                  Update: {
                    "body"?: string,"category"?: string,"created_at"?: string,"id"?: string,"is_private"?: boolean,"read_at"?: string | null,"reply"?: string | null,"responded_at"?: string | null,"sender_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"mood_entries": {
                  Row: {
                    "created_at": string,"id": string,"mood": number | null,"note": string | null,"shared": boolean,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"mood"?: number | null,"note"?: string | null,"shared"?: boolean,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"mood"?: number | null,"note"?: string | null,"shared"?: boolean,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"notification_events": {
                  Row: {
                    "channel": string,"created_at": string,"detail": string | null,"id": string,"kind": string,"message_id": string | null,"request_id": string | null,"status": string
                  }
                  Insert: {
                    "channel": string,"created_at"?: string,"detail"?: string | null,"id"?: string,"kind": string,"message_id"?: string | null,"request_id"?: string | null,"status": string
                  }
                  Update: {
                    "channel"?: string,"created_at"?: string,"detail"?: string | null,"id"?: string,"kind"?: string,"message_id"?: string | null,"request_id"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_events_message_id_fkey"
      columns: ["message_id"]
isOneToOne: false
      referencedRelation: "messages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notification_events_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "adam_requests"
      referencedColumns: ["id"]
    }
                  ]
                },"notification_subscriptions": {
                  Row: {
                    "auth": string,"created_at": string,"endpoint": string,"id": string,"last_used_at": string | null,"p256dh": string,"user_agent": string | null,"user_id": string
                  }
                  Insert: {
                    "auth": string,"created_at"?: string,"endpoint": string,"id"?: string,"last_used_at"?: string | null,"p256dh": string,"user_agent"?: string | null,"user_id"?: string
                  }
                  Update: {
                    "auth"?: string,"created_at"?: string,"endpoint"?: string,"id"?: string,"last_used_at"?: string | null,"p256dh"?: string,"user_agent"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"open_when_cards": {
                  Row: {
                    "animation": string,"audio_id": string | null,"body": string,"color": string | null,"created_at": string,"cta_action": string,"icon": string | null,"id": string,"is_published": boolean,"last_opened_at": string | null,"media_id": string | null,"opened_count": number,"position": number,"title": string,"updated_at": string
                  }
                  Insert: {
                    "animation"?: string,"audio_id"?: string | null,"body"?: string,"color"?: string | null,"created_at"?: string,"cta_action"?: string,"icon"?: string | null,"id"?: string,"is_published"?: boolean,"last_opened_at"?: string | null,"media_id"?: string | null,"opened_count"?: number,"position"?: number,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "animation"?: string,"audio_id"?: string | null,"body"?: string,"color"?: string | null,"created_at"?: string,"cta_action"?: string,"icon"?: string | null,"id"?: string,"is_published"?: boolean,"last_opened_at"?: string | null,"media_id"?: string | null,"opened_count"?: number,"position"?: number,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "open_when_cards_audio_id_fkey"
      columns: ["audio_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "open_when_cards_media_id_fkey"
      columns: ["media_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    }
                  ]
                },"phrases": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"kind": string,"text": string,"updated_at": string,"weight": number
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"kind": string,"text": string,"updated_at"?: string,"weight"?: number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"kind"?: string,"text"?: string,"updated_at"?: string,"weight"?: number
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string | null,"id": string,"nickname": string | null,"onboarded_at": string | null,"role": string,"share_activity": boolean,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"display_name"?: string | null,"id": string,"nickname"?: string | null,"onboarded_at"?: string | null,"role"?: string,"share_activity"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string | null,"id"?: string,"nickname"?: string | null,"onboarded_at"?: string | null,"role"?: string,"share_activity"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"quiz_questions": {
                  Row: {
                    "correct_index": number,"created_at": string,"explanation": string | null,"id": string,"is_active": boolean,"options": (string)[],"position": number,"question": string,"updated_at": string
                  }
                  Insert: {
                    "correct_index"?: number,"created_at"?: string,"explanation"?: string | null,"id"?: string,"is_active"?: boolean,"options": (string)[],"position"?: number,"question": string,"updated_at"?: string
                  }
                  Update: {
                    "correct_index"?: number,"created_at"?: string,"explanation"?: string | null,"id"?: string,"is_active"?: boolean,"options"?: (string)[],"position"?: number,"question"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"readiness_checks": {
                  Row: {
                    "done_at": string,"done_by": string | null,"state": string,"task_id": string
                  }
                  Insert: {
                    "done_at"?: string,"done_by"?: string | null,"state"?: string,"task_id": string
                  }
                  Update: {
                    "done_at"?: string,"done_by"?: string | null,"state"?: string,"task_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"time_capsules": {
                  Row: {
                    "body": string,"created_at": string,"id": string,"is_published": boolean,"media_id": string | null,"opened_at": string | null,"teaser": string | null,"title": string,"unlock_at": string,"updated_at": string
                  }
                  Insert: {
                    "body"?: string,"created_at"?: string,"id"?: string,"is_published"?: boolean,"media_id"?: string | null,"opened_at"?: string | null,"teaser"?: string | null,"title": string,"unlock_at": string,"updated_at"?: string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"id"?: string,"is_published"?: boolean,"media_id"?: string | null,"opened_at"?: string | null,"teaser"?: string | null,"title"?: string,"unlock_at"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "time_capsules_media_id_fkey"
      columns: ["media_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_usage_stats":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"app_role":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"increment_ai_usage":
{ Args: { "p_input_tokens": number,"p_output_tokens": number,"p_requests": number,"p_scope": string }; Returns: undefined
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_member":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"list_time_capsules":
{ Args: Record<PropertyKey, never>; Returns: {
              "id": string,"is_unlocked": boolean,"media_id": string,"opened_at": string,"teaser": string,"title": string,"unlock_at": string
            }[]
                           },
"mark_capsule_opened":
{ Args: { "capsule_id": string }; Returns: undefined
                           },
"mark_open_when_opened":
{ Args: { "card_id": string }; Returns: undefined
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const

