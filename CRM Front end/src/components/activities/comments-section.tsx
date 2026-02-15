"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { format } from "date-fns";
import {
  MessageSquare,
  Send,
  MoreHorizontal,
  Edit2,
  Trash2,
  Reply,
  Heart,
  ThumbsUp,
  PartyPopper,
  Loader2,
  ChevronDown,
  X,
  Mail,
  Paperclip,
  Building2,
  Users,
  Folder,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getComments,
  createComment,
  updateComment,
  deleteComment,
  getCommentReplies,
  reactToComment,
  getMentionSuggestions,
} from "@/lib/api/activities";
import { getClientDepartmentFolders } from "@/lib/api/departments";
import type { Comment, MentionSuggestion, ReactionType } from "@/types/activities";
import type { DepartmentFolderGroup, DepartmentClientFolderTree } from "@/types/department";

const REACTION_OPTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: "like", emoji: "👍", label: "Like" },
  { type: "heart", emoji: "❤️", label: "Love" },
  { type: "celebrate", emoji: "🎉", label: "Celebrate" },
];

interface CommentsSectionProps {
  entityType: "contact" | "corporation";
  entityId: string;
  className?: string;
  maxHeight?: string;
}

export function CommentsSection({
  entityType,
  entityId,
  className,
  maxHeight = "500px",
}: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editContent, setEditContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<Comment | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [loadingReplies, setLoadingReplies] = useState<Set<string>>(new Set());
  const [repliesCache, setRepliesCache] = useState<Record<string, Comment[]>>({});

  // Mention state
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionTargetRef, setMentionTargetRef] = useState<"new" | "reply" | "edit">("new");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Email and attachment options
  const [sendEmail, setSendEmail] = useState(false);
  const [attachToDepartment, setAttachToDepartment] = useState(false);
  const [selectedDepartmentFolder, setSelectedDepartmentFolder] = useState<string>("");
  const [departmentFolders, setDepartmentFolders] = useState<DepartmentFolderGroup[]>([]);
  const [mentionedDepartments, setMentionedDepartments] = useState<MentionSuggestion[]>([]);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getComments({
        entity_type: entityType,
        entity_id: entityId,
        include_replies: false,
      });
      setComments(response.results);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Fetch department folders when attach option is enabled and departments are mentioned
  useEffect(() => {
    const fetchDeptFolders = async () => {
      if (attachToDepartment && mentionedDepartments.length > 0) {
        try {
          const data = await getClientDepartmentFolders({
            contact: entityType === "contact" ? entityId : undefined,
            corporation: entityType === "corporation" ? entityId : undefined,
          });
          setDepartmentFolders(data);
        } catch (error) {
          console.error("Error fetching department folders:", error);
        }
      }
    };
    fetchDeptFolders();
  }, [attachToDepartment, mentionedDepartments, entityType, entityId]);

  // Track mentioned departments in the comment
  useEffect(() => {
    const deptMentionPattern = /@(\w+)/g;
    const matches = newComment.match(deptMentionPattern) || [];
    const deptMentions = mentionSuggestions.filter(
      (s) => s.suggestion_type === "department" && matches.some(m => m.toLowerCase() === `@${s.mention_key}`)
    );
    // Also check previous suggestions that were selected
    const allDeptMentions = [...mentionedDepartments];
    for (const match of matches) {
      const key = match.slice(1).toLowerCase();
      const existing = allDeptMentions.find(d => d.mention_key === key);
      if (!existing) {
        const found = mentionSuggestions.find(
          s => s.suggestion_type === "department" && s.mention_key === key
        );
        if (found) {
          allDeptMentions.push(found);
        }
      }
    }
    // Filter to only keep departments that are still in the comment
    const filtered = allDeptMentions.filter(d =>
      matches.some(m => m.toLowerCase() === `@${d.mention_key}`)
    );
    if (JSON.stringify(filtered) !== JSON.stringify(mentionedDepartments)) {
      setMentionedDepartments(filtered);
    }
  }, [newComment, mentionSuggestions]);

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      await createComment({
        content: newComment.trim(),
        entity_type: entityType,
        entity_id: entityId,
        send_email: sendEmail,
        department_folder: attachToDepartment && selectedDepartmentFolder ? selectedDepartmentFolder : undefined,
      });
      setNewComment("");
      setSendEmail(false);
      setAttachToDepartment(false);
      setSelectedDepartmentFolder("");
      setMentionedDepartments([]);
      fetchComments();
    } catch (error) {
      console.error("Error creating comment:", error);
      alert("Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async () => {
    if (!replyContent.trim() || !replyingTo) return;

    setSubmitting(true);
    try {
      await createComment({
        content: replyContent.trim(),
        entity_type: entityType,
        entity_id: entityId,
        parent: replyingTo.id,
      });
      setReplyContent("");
      setReplyingTo(null);

      // Refresh replies for this comment
      const replies = await getCommentReplies(replyingTo.id);
      setRepliesCache((prev) => ({ ...prev, [replyingTo.id]: replies }));
      setExpandedReplies((prev) => new Set(prev).add(replyingTo.id));

      fetchComments();
    } catch (error) {
      console.error("Error creating reply:", error);
      alert("Failed to add reply");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateComment = async () => {
    if (!editContent.trim() || !editingComment) return;

    setSubmitting(true);
    try {
      await updateComment(editingComment.id, { content: editContent.trim() });
      setEditingComment(null);
      setEditContent("");
      fetchComments();
    } catch (error) {
      console.error("Error updating comment:", error);
      alert("Failed to update comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteComment(deleteConfirm.id);
      setDeleteConfirm(null);
      fetchComments();
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert("Failed to delete comment");
    }
  };

  const handleReaction = async (commentId: string, reactionType: ReactionType) => {
    try {
      await reactToComment(commentId, reactionType);
      fetchComments();
    } catch (error) {
      console.error("Error reacting to comment:", error);
    }
  };

  const toggleReplies = async (comment: Comment) => {
    if (expandedReplies.has(comment.id)) {
      setExpandedReplies((prev) => {
        const next = new Set(prev);
        next.delete(comment.id);
        return next;
      });
    } else {
      // Fetch replies if not cached
      if (!repliesCache[comment.id]) {
        setLoadingReplies((prev) => new Set(prev).add(comment.id));
        try {
          const replies = await getCommentReplies(comment.id);
          setRepliesCache((prev) => ({ ...prev, [comment.id]: replies }));
        } catch (error) {
          console.error("Error fetching replies:", error);
        } finally {
          setLoadingReplies((prev) => {
            const next = new Set(prev);
            next.delete(comment.id);
            return next;
          });
        }
      }
      setExpandedReplies((prev) => new Set(prev).add(comment.id));
    }
  };

  // Handle @mention input
  const handleTextChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
    setter: (value: string) => void,
    target: "new" | "reply" | "edit"
  ) => {
    const value = e.target.value;
    setter(value);

    // Check for @mention
    const cursorPosition = e.target.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setMentionTargetRef(target);
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (mentionQuery.length >= 1) {
        try {
          const suggestions = await getMentionSuggestions(mentionQuery);
          setMentionSuggestions(suggestions);
        } catch (error) {
          console.error("Error fetching mention suggestions:", error);
        }
      } else {
        setMentionSuggestions([]);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(debounceTimer);
  }, [mentionQuery]);

  const insertMention = (
    suggestion: MentionSuggestion,
    currentValue: string,
    setter: (value: string) => void
  ) => {
    const mentionText = `@${suggestion.mention_key}`;
    const newValue = currentValue.replace(/@\w*$/, mentionText + " ");
    setter(newValue);
    setShowMentions(false);
    setMentionQuery("");

    // Track department mentions
    if (suggestion.suggestion_type === "department") {
      setMentionedDepartments((prev) => {
        if (!prev.find((d) => d.id === suggestion.id)) {
          return [...prev, suggestion];
        }
        return prev;
      });
    }
  };

  const renderCommentCard = (comment: Comment, isReply: boolean = false) => (
    <div
      key={comment.id}
      className={cn(
        "group relative",
        isReply ? "pl-8 border-l-2 border-muted" : ""
      )}
    >
      <div className="flex gap-3 p-4 bg-card border rounded-lg">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={comment.author.avatar || undefined} />
          <AvatarFallback className="text-xs">{comment.author.initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{comment.author.full_name}</span>
              <span className="text-xs text-muted-foreground">{comment.time_ago}</span>
              {comment.is_edited && (
                <span className="text-xs text-muted-foreground">(edited)</span>
              )}
            </div>

            {(comment.can_edit || comment.can_delete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {comment.can_edit && (
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingComment(comment);
                        setEditContent(comment.content);
                      }}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {comment.can_delete && (
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteConfirm(comment)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {editingComment?.id === comment.id ? (
            <div className="mt-2 space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => handleTextChange(e, setEditContent, "edit")}
                className="min-h-[80px]"
                placeholder="Edit your comment..."
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleUpdateComment}
                  disabled={submitting || !editContent.trim()}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingComment(null);
                    setEditContent("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm mt-1 whitespace-pre-wrap">
                {comment.content.split(/(@\w+)/g).map((part, i) =>
                  part.startsWith("@") ? (
                    <span key={i} className="text-primary font-medium">
                      {part}
                    </span>
                  ) : (
                    part
                  )
                )}
              </p>

              {/* Mentioned users and departments */}
              {(comment.mentioned_users.length > 0 || comment.mentioned_departments?.length > 0) && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {comment.mentioned_users.map((user) => (
                    <Badge key={user.id} variant="secondary" className="text-xs">
                      @{user.first_name || user.email.split("@")[0]}
                    </Badge>
                  ))}
                  {comment.mentioned_departments?.map((dept) => (
                    <Badge
                      key={dept.id}
                      variant="outline"
                      className="text-xs"
                      style={{ borderColor: dept.color, color: dept.color }}
                    >
                      @{dept.code}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Email and attachment indicators */}
              {(comment.email_sent || comment.department_folder_info) && (
                <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                  {comment.email_sent && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      Enviado por correo
                    </span>
                  )}
                  {comment.department_folder_info && (
                    <span className="flex items-center gap-1">
                      <Folder className="h-3 w-3" />
                      {comment.department_folder_info.department_name}: {comment.department_folder_info.name}
                    </span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 mt-3">
                {/* Reactions */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 px-2">
                      <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                      {Object.values(comment.reaction_counts).reduce((a, b) => a + b, 0) ||
                        "React"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="start">
                    <div className="flex gap-1">
                      {REACTION_OPTIONS.map((option) => (
                        <Button
                          key={option.type}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-lg"
                          onClick={() => handleReaction(comment.id, option.type)}
                          title={option.label}
                        >
                          {option.emoji}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Reaction display */}
                {Object.entries(comment.reaction_counts).map(([type, count]) => {
                  if (count === 0) return null;
                  const option = REACTION_OPTIONS.find((o) => o.type === type);
                  return (
                    <span key={type} className="text-xs text-muted-foreground">
                      {option?.emoji} {count}
                    </span>
                  );
                })}

                {/* Reply button (only for top-level comments) */}
                {!isReply && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setReplyingTo(comment)}
                  >
                    <Reply className="h-3.5 w-3.5 mr-1" />
                    Reply
                  </Button>
                )}
              </div>

              {/* Reply input */}
              {replyingTo?.id === comment.id && (
                <div className="mt-3 space-y-2 relative">
                  <Textarea
                    value={replyContent}
                    onChange={(e) => handleTextChange(e, setReplyContent, "reply")}
                    placeholder={`Reply to ${comment.author.first_name}... (use @ to mention)`}
                    className="min-h-[60px]"
                  />
                  {showMentions && mentionTargetRef === "reply" && mentionSuggestions.length > 0 && (
                    <MentionDropdown
                      suggestions={mentionSuggestions}
                      onSelect={(s) => insertMention(s, replyContent, setReplyContent)}
                      onClose={() => setShowMentions(false)}
                    />
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSubmitReply}
                      disabled={submitting || !replyContent.trim()}
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5 mr-1" />
                          Reply
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyContent("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Replies */}
              {!isReply && comment.replies_count > 0 && (
                <div className="mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-muted-foreground"
                    onClick={() => toggleReplies(comment)}
                  >
                    {loadingReplies.has(comment.id) ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    ) : (
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 mr-1 transition-transform",
                          expandedReplies.has(comment.id) && "rotate-180"
                        )}
                      />
                    )}
                    {comment.replies_count}{" "}
                    {comment.replies_count === 1 ? "reply" : "replies"}
                  </Button>

                  {expandedReplies.has(comment.id) && repliesCache[comment.id] && (
                    <div className="mt-2 space-y-2">
                      {repliesCache[comment.id].map((reply) =>
                        renderCommentCard(reply, true)
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={cn("flex flex-col", className)}>
      <h3 className="text-lg font-semibold mb-4">Comments</h3>

      {/* New comment input */}
      <div className="mb-4 relative">
        {/* Comment options */}
        <div className="flex flex-wrap items-center gap-4 mb-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="send-email"
              checked={sendEmail}
              onCheckedChange={(checked) => setSendEmail(checked === true)}
            />
            <Label
              htmlFor="send-email"
              className="text-sm font-normal cursor-pointer flex items-center gap-1"
            >
              <Mail className="h-3.5 w-3.5" />
              Enviar por correo
            </Label>
          </div>

          {mentionedDepartments.length > 0 && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="attach-dept"
                checked={attachToDepartment}
                onCheckedChange={(checked) => {
                  setAttachToDepartment(checked === true);
                  if (!checked) {
                    setSelectedDepartmentFolder("");
                  }
                }}
              />
              <Label
                htmlFor="attach-dept"
                className="text-sm font-normal cursor-pointer flex items-center gap-1"
              >
                <Paperclip className="h-3.5 w-3.5" />
                Adjuntar a departamento
              </Label>
            </div>
          )}
        </div>

        {/* Department folder selector */}
        {attachToDepartment && mentionedDepartments.length > 0 && (
          <div className="mb-2 p-3 bg-muted/50 rounded-lg border">
            <Label className="text-sm font-medium mb-2 block">
              Seleccionar carpeta de departamento:
            </Label>
            <Select
              value={selectedDepartmentFolder}
              onValueChange={setSelectedDepartmentFolder}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar carpeta..." />
              </SelectTrigger>
              <SelectContent>
                {departmentFolders
                  .filter((dept) =>
                    mentionedDepartments.some((md) => md.id === dept.id)
                  )
                  .map((dept) => (
                    <div key={dept.id}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded"
                          style={{ backgroundColor: dept.color }}
                        />
                        {dept.name}
                      </div>
                      {dept.folders.map((folder) => (
                        <SelectItem key={folder.id} value={folder.id}>
                          <div className="flex items-center gap-2">
                            <Folder className="h-3.5 w-3.5" />
                            {folder.name}
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Textarea
          ref={textareaRef}
          value={newComment}
          onChange={(e) => handleTextChange(e, setNewComment, "new")}
          placeholder="Add a comment... (use @ to mention team members or departments)"
          className="min-h-[80px] resize-none"
        />
        {showMentions && mentionTargetRef === "new" && mentionSuggestions.length > 0 && (
          <MentionDropdown
            suggestions={mentionSuggestions}
            onSelect={(s) => insertMention(s, newComment, setNewComment)}
            onClose={() => setShowMentions(false)}
          />
        )}
        <div className="flex justify-end mt-2">
          <Button
            onClick={handleSubmitComment}
            disabled={submitting || !newComment.trim()}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Post Comment
          </Button>
        </div>
      </div>

      {/* Comments list */}
      <ScrollArea style={{ maxHeight }}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
            <p>No comments yet</p>
            <p className="text-sm">Be the first to add a comment</p>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => renderCommentCard(comment))}
          </div>
        )}
      </ScrollArea>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteComment} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Mention suggestions dropdown
function MentionDropdown({
  suggestions,
  onSelect,
  onClose,
}: {
  suggestions: MentionSuggestion[];
  onSelect: (suggestion: MentionSuggestion) => void;
  onClose: () => void;
}) {
  const users = suggestions.filter((s) => s.suggestion_type === "user");
  const departments = suggestions.filter((s) => s.suggestion_type === "department");

  return (
    <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border rounded-md shadow-lg max-h-64 overflow-y-auto">
      <div className="p-1">
        {/* Users section */}
        {users.length > 0 && (
          <>
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              Usuarios
            </div>
            {users.map((suggestion) => (
              <button
                key={suggestion.id}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-accent rounded-sm transition-colors"
                onClick={() => onSelect(suggestion)}
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={suggestion.avatar || undefined} />
                  <AvatarFallback className="text-xs">
                    {suggestion.first_name?.[0] || suggestion.email?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{suggestion.display_name}</p>
                  <p className="text-xs text-muted-foreground truncate">@{suggestion.mention_key}</p>
                </div>
              </button>
            ))}
          </>
        )}

        {/* Departments section */}
        {departments.length > 0 && (
          <>
            {users.length > 0 && <div className="border-t my-1" />}
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              Departamentos
            </div>
            {departments.map((suggestion) => (
              <button
                key={suggestion.id}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-accent rounded-sm transition-colors"
                onClick={() => onSelect(suggestion)}
              >
                <div
                  className="h-6 w-6 rounded flex items-center justify-center text-white text-[10px] font-semibold"
                  style={{ backgroundColor: suggestion.color || "#6366f1" }}
                >
                  {suggestion.code?.substring(0, 2) || "DP"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{suggestion.display_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    @{suggestion.mention_key} · {suggestion.user_count || 0} usuarios
                  </p>
                </div>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
