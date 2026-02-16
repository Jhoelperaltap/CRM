/**
 * API client for Activity Timeline and Comments.
 */

import api from "../api";
import type {
  Activity,
  Comment,
  MentionSuggestion,
  CreateActivityPayload,
  CreateCommentPayload,
  UpdateCommentPayload,
  ReactionType,
} from "@/types/activities";

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

interface ActivityFilters {
  entity_type?: string;
  entity_id?: string;
  activity_type?: string;
  department?: string;
  performed_by?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

interface CommentFilters {
  entity_type?: string;
  entity_id?: string;
  include_replies?: boolean;
  page?: number;
  page_size?: number;
}

// Activities API
export async function getActivities(
  filters: ActivityFilters = {}
): Promise<PaginatedResponse<Activity>> {
  const params = new URLSearchParams();

  if (filters.entity_type) params.append("entity_type", filters.entity_type);
  if (filters.entity_id) params.append("entity_id", filters.entity_id);
  if (filters.activity_type) params.append("activity_type", filters.activity_type);
  if (filters.department) params.append("department", filters.department);
  if (filters.performed_by) params.append("performed_by", filters.performed_by);
  if (filters.start_date) params.append("start_date", filters.start_date);
  if (filters.end_date) params.append("end_date", filters.end_date);
  if (filters.page) params.append("page", filters.page.toString());
  if (filters.page_size) params.append("page_size", filters.page_size.toString());

  const { data } = await api.get<PaginatedResponse<Activity>>(
    `/activities/?${params.toString()}`
  );
  return data;
}

export async function getActivity(id: string): Promise<Activity> {
  const { data } = await api.get<Activity>(`/activities/${id}/`);
  return data;
}

export async function createActivity(payload: CreateActivityPayload): Promise<Activity> {
  const { data } = await api.post<Activity>("/activities/", payload);
  return data;
}

export async function getActivityTypes(): Promise<{ value: string; label: string }[]> {
  const { data } = await api.get<{ value: string; label: string }[]>("/activities/types/");
  return data;
}

// Comments API
export async function getComments(
  filters: CommentFilters = {}
): Promise<PaginatedResponse<Comment>> {
  const params = new URLSearchParams();

  if (filters.entity_type) params.append("entity_type", filters.entity_type);
  if (filters.entity_id) params.append("entity_id", filters.entity_id);
  if (filters.include_replies !== undefined) {
    params.append("include_replies", filters.include_replies.toString());
  }
  if (filters.page) params.append("page", filters.page.toString());
  if (filters.page_size) params.append("page_size", filters.page_size.toString());

  const { data } = await api.get<PaginatedResponse<Comment>>(
    `/comments/?${params.toString()}`
  );
  return data;
}

export async function getComment(id: string): Promise<Comment> {
  const { data } = await api.get<Comment>(`/comments/${id}/`);
  return data;
}

export async function createComment(payload: CreateCommentPayload | FormData): Promise<Comment> {
  // If payload is FormData, send as multipart/form-data
  if (payload instanceof FormData) {
    const { data } = await api.post<Comment>("/comments/", payload, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return data;
  }

  const { data } = await api.post<Comment>("/comments/", payload);
  return data;
}

export async function updateComment(
  id: string,
  payload: UpdateCommentPayload
): Promise<Comment> {
  const { data } = await api.patch<Comment>(`/comments/${id}/`, payload);
  return data;
}

export async function deleteComment(id: string): Promise<void> {
  await api.delete(`/comments/${id}/`);
}

export async function getCommentReplies(commentId: string): Promise<Comment[]> {
  const { data } = await api.get<Comment[]>(`/comments/${commentId}/replies/`);
  return data;
}

export async function reactToComment(
  commentId: string,
  reactionType: ReactionType
): Promise<{ status: "added" | "removed" }> {
  const { data } = await api.post<{ status: "added" | "removed" }>(
    `/comments/${commentId}/react/`,
    { reaction_type: reactionType }
  );
  return data;
}

export async function getMentionSuggestions(
  query: string,
  limit: number = 10
): Promise<MentionSuggestion[]> {
  const params = new URLSearchParams({ q: query, limit: limit.toString() });
  const { data } = await api.get<MentionSuggestion[]>(
    `/comments/mention_suggestions/?${params.toString()}`
  );
  return data;
}
