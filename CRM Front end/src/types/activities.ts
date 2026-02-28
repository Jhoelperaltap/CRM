/**
 * Types for Activity Timeline and Comments.
 */

export interface UserMini {
  id: string;
  email: string;
  full_name: string;
  first_name: string;
  last_name: string;
  initials: string;
  avatar: string | null;
}

export type ActivityType =
  | "email_sent"
  | "email_received"
  | "document_uploaded"
  | "document_shared"
  | "document_viewed"
  | "note_added"
  | "comment_added"
  | "appointment_scheduled"
  | "appointment_completed"
  | "appointment_cancelled"
  | "case_created"
  | "case_updated"
  | "case_closed"
  | "task_created"
  | "task_completed"
  | "field_changed"
  | "status_changed"
  | "call_logged"
  | "meeting_logged"
  | "record_created"
  | "record_updated"
  | "linked"
  | "unlinked";

export interface Activity {
  id: string;
  activity_type: ActivityType;
  activity_type_display: string;
  title: string;
  description: string;
  metadata: Record<string, unknown>;
  performed_by: UserMini | null;
  entity_type: string;
  entity_id: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  department_name: string | null;
  created_at: string;
  time_ago: string;
}

export type ReactionType = "like" | "thumbs_up" | "heart" | "celebrate";

export interface CommentReaction {
  id: string;
  reaction_type: ReactionType;
  user: UserMini;
  created_at: string;
}

export interface DepartmentMini {
  id: string;
  name: string;
  code: string;
  color: string;
}

export interface DepartmentFolderMini {
  id: string;
  name: string;
  department: string;
  department_name: string;
}

export interface CommentAttachment {
  id: string;
  title: string;
  file_url: string | null;
}

export interface Comment {
  id: string;
  content: string;
  author: UserMini;
  mentioned_users: UserMini[];
  mentioned_departments: DepartmentMini[];
  parent: string | null;
  is_edited: boolean;
  edited_at: string | null;
  reactions: CommentReaction[];
  reaction_counts: Record<ReactionType, number>;
  replies_count: number;
  entity_type: string;
  entity_id: string;
  send_email: boolean;
  email_sent: boolean;
  department_folder: string | null;
  department_folder_info: DepartmentFolderMini | null;
  attachments: CommentAttachment[];
  created_at: string;
  time_ago: string;
  can_edit: boolean;
  can_delete: boolean;
}

export interface MentionSuggestion {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  display_name: string;
  mention_key: string;
  avatar?: string | null;
  suggestion_type: "user" | "department";
  // Department-specific fields
  name?: string;
  code?: string;
  color?: string;
  icon?: string;
  user_count?: number;
}

// API payloads
export interface CreateActivityPayload {
  activity_type: ActivityType;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  entity_type: "contact" | "corporation";
  entity_id: string;
  related_entity_type?: string;
  related_entity_id?: string;
  department?: string;
}

export interface CreateCommentPayload {
  content: string;
  entity_type: "contact" | "corporation" | "case";
  entity_id: string;
  parent?: string;
  send_email?: boolean;
  department_folder?: string;
}

export interface UpdateCommentPayload {
  content: string;
}

// Activity type icons and colors
export const ACTIVITY_TYPE_CONFIG: Record<
  ActivityType,
  { icon: string; color: string; bgColor: string }
> = {
  email_sent: { icon: "Send", color: "text-blue-600", bgColor: "bg-blue-100" },
  email_received: { icon: "Mail", color: "text-blue-600", bgColor: "bg-blue-100" },
  document_uploaded: { icon: "FileUp", color: "text-green-600", bgColor: "bg-green-100" },
  document_shared: { icon: "Share2", color: "text-green-600", bgColor: "bg-green-100" },
  document_viewed: { icon: "Eye", color: "text-gray-600", bgColor: "bg-gray-100" },
  note_added: { icon: "StickyNote", color: "text-yellow-600", bgColor: "bg-yellow-100" },
  comment_added: { icon: "MessageSquare", color: "text-purple-600", bgColor: "bg-purple-100" },
  appointment_scheduled: { icon: "Calendar", color: "text-indigo-600", bgColor: "bg-indigo-100" },
  appointment_completed: { icon: "CalendarCheck", color: "text-green-600", bgColor: "bg-green-100" },
  appointment_cancelled: { icon: "CalendarX", color: "text-red-600", bgColor: "bg-red-100" },
  case_created: { icon: "FolderPlus", color: "text-blue-600", bgColor: "bg-blue-100" },
  case_updated: { icon: "FolderEdit", color: "text-blue-600", bgColor: "bg-blue-100" },
  case_closed: { icon: "FolderCheck", color: "text-green-600", bgColor: "bg-green-100" },
  task_created: { icon: "ListPlus", color: "text-orange-600", bgColor: "bg-orange-100" },
  task_completed: { icon: "CheckCircle", color: "text-green-600", bgColor: "bg-green-100" },
  field_changed: { icon: "Edit3", color: "text-gray-600", bgColor: "bg-gray-100" },
  status_changed: { icon: "ArrowRightCircle", color: "text-blue-600", bgColor: "bg-blue-100" },
  call_logged: { icon: "Phone", color: "text-teal-600", bgColor: "bg-teal-100" },
  meeting_logged: { icon: "Users", color: "text-indigo-600", bgColor: "bg-indigo-100" },
  record_created: { icon: "Plus", color: "text-green-600", bgColor: "bg-green-100" },
  record_updated: { icon: "Edit", color: "text-blue-600", bgColor: "bg-blue-100" },
  linked: { icon: "Link", color: "text-blue-600", bgColor: "bg-blue-100" },
  unlinked: { icon: "Unlink", color: "text-gray-600", bgColor: "bg-gray-100" },
};

export const REACTION_EMOJI: Record<ReactionType, string> = {
  like: "👍",
  thumbs_up: "👍",
  heart: "❤️",
  celebrate: "🎉",
};
