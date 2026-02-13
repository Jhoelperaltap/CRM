"use client";

import { useState, useEffect } from "react";
import { Check, Plus, Loader2, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagBadge } from "./tag-badge";
import {
  getContactTags,
  createContactTag,
  getTagAssignments,
  assignTag,
  removeTagAssignment,
} from "@/lib/api/contact-tags";
import type { ContactTag, ContactTagAssignment } from "@/types/contact-tags";
import { TAG_COLORS } from "@/types/contact-tags";

interface TagSelectorProps {
  contactId: string;
  className?: string;
}

export function TagSelector({ contactId, className }: TagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [tags, setTags] = useState<ContactTag[]>([]);
  const [assignments, setAssignments] = useState<ContactTagAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Create tag form
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0].value);
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tagsRes, assignmentsRes] = await Promise.all([
        getContactTags({ page_size: "100" }),
        getTagAssignments({ contact: contactId }),
      ]);
      setTags(tagsRes.results);
      setAssignments(assignmentsRes.results);
    } catch (error) {
      console.error("Error fetching tags:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [contactId]);

  const assignedTagIds = new Set(assignments.map((a) => a.tag));

  const handleToggleTag = async (tag: ContactTag) => {
    const existingAssignment = assignments.find((a) => a.tag === tag.id);

    try {
      if (existingAssignment) {
        await removeTagAssignment(existingAssignment.id);
        setAssignments((prev) => prev.filter((a) => a.id !== existingAssignment.id));
      } else {
        const newAssignment = await assignTag(contactId, tag.id);
        setAssignments((prev) => [...prev, newAssignment]);
      }
    } catch (error) {
      console.error("Error toggling tag:", error);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    setCreating(true);
    try {
      const newTag = await createContactTag({
        name: newTagName.trim(),
        color: newTagColor,
        tag_type: "shared",
      });
      setTags((prev) => [...prev, newTag]);
      setNewTagName("");
      setNewTagColor(TAG_COLORS[0].value);
      setCreateOpen(false);

      // Automatically assign the new tag
      const assignment = await assignTag(contactId, newTag.id);
      setAssignments((prev) => [...prev, assignment]);
    } catch (error) {
      console.error("Error creating tag:", error);
      alert("Failed to create tag");
    } finally {
      setCreating(false);
    }
  };

  const handleRemoveTag = async (assignment: ContactTagAssignment) => {
    try {
      await removeTagAssignment(assignment.id);
      setAssignments((prev) => prev.filter((a) => a.id !== assignment.id));
    } catch (error) {
      console.error("Error removing tag:", error);
    }
  };

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading tags...</span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/* Assigned tags */}
      {assignments.map((assignment) => (
        <TagBadge
          key={assignment.id}
          name={assignment.tag_name}
          color={assignment.tag_color}
          onRemove={() => handleRemoveTag(assignment)}
        />
      ))}

      {/* Add tag button */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 gap-1">
            <Tag className="h-3.5 w-3.5" />
            Add Tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search tags..." />
            <CommandList>
              <CommandEmpty>No tags found.</CommandEmpty>
              <CommandGroup>
                {tags.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    value={tag.name}
                    onSelect={() => handleToggleTag(tag)}
                    className="flex items-center gap-2"
                  >
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="flex-1">{tag.name}</span>
                    {assignedTagIds.has(tag.id) && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setCreateOpen(true);
                  }}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create new tag
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Create tag dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create New Tag</DialogTitle>
            <DialogDescription>
              Create a new tag to organize your contacts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tag-name">Name</Label>
              <Input
                id="tag-name"
                placeholder="Enter tag name..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {TAG_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition-transform hover:scale-110",
                      newTagColor === color.value
                        ? "border-foreground scale-110"
                        : "border-transparent"
                    )}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setNewTagColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            {newTagName && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <TagBadge name={newTagName} color={newTagColor} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTag}
              disabled={creating || !newTagName.trim()}
            >
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
