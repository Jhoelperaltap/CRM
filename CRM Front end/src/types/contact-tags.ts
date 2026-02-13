/**
 * Types for Contact Tags
 */

export interface ContactTag {
  id: string;
  name: string;
  color: string;
  tag_type: "shared" | "personal";
  created_by: string | null;
  created_by_name: string | null;
  contact_count: number;
  created_at: string;
}

export interface ContactTagAssignment {
  id: string;
  contact: string;
  tag: string;
  tag_name: string;
  tag_color: string;
  assigned_by: string | null;
  assigned_by_name: string | null;
  assigned_at: string;
}

export interface CreateTagPayload {
  name: string;
  color?: string;
  tag_type?: "shared" | "personal";
}

export interface BulkAssignPayload {
  contact_ids: string[];
  tag_ids: string[];
}

export const TAG_COLORS = [
  { name: "Indigo", value: "#6366f1" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Green", value: "#22c55e" },
  { name: "Lime", value: "#84cc16" },
  { name: "Yellow", value: "#eab308" },
  { name: "Orange", value: "#f97316" },
  { name: "Red", value: "#ef4444" },
  { name: "Pink", value: "#ec4899" },
  { name: "Purple", value: "#a855f7" },
  { name: "Gray", value: "#6b7280" },
];
