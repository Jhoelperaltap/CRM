"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Edit, MessageSquare, Calendar, Brain, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  getChatbotConfig,
  updateChatbotConfig,
  getKnowledgeEntries,
  createKnowledgeEntry,
  updateKnowledgeEntry,
  deleteKnowledgeEntry,
  getAppointmentSlots,
  createAppointmentSlot,
  deleteAppointmentSlot,
  getChatbotStats,
} from "@/lib/api/chatbot";
import {
  ChatbotConfiguration,
  ChatbotKnowledgeEntry,
  ChatbotAppointmentSlot,
  ChatbotStats,
  AI_PROVIDER_LABELS,
  AI_MODELS,
  ENTRY_TYPE_LABELS,
  DAY_OF_WEEK_LABELS,
  KnowledgeEntryType,
} from "@/types/chatbot";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export default function ChatbotSettingsPage() {
  const [activeTab, setActiveTab] = useState("config");
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<ChatbotConfiguration | null>(null);
  const [knowledge, setKnowledge] = useState<ChatbotKnowledgeEntry[]>([]);
  const [slots, setSlots] = useState<ChatbotAppointmentSlot[]>([]);
  const [stats, setStats] = useState<ChatbotStats | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [configData, knowledgeData, slotsData, statsData] = await Promise.all([
        getChatbotConfig(),
        getKnowledgeEntries(),
        getAppointmentSlots(),
        getChatbotStats(),
      ]);
      setConfig(configData);
      setKnowledge(knowledgeData);
      setSlots(slotsData);
      setStats(statsData);
    } catch (err) {
      console.error("Failed to load chatbot data", err);
      setMessage({ type: "error", text: "Failed to load chatbot configuration." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refreshKnowledge = async () => {
    try {
      const data = await getKnowledgeEntries();
      setKnowledge(data);
    } catch (err) {
      console.error("Failed to refresh knowledge", err);
    }
  };

  const refreshSlots = async () => {
    try {
      const data = await getAppointmentSlots();
      setSlots(data);
    } catch (err) {
      console.error("Failed to refresh slots", err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="AI Chatbot" description="Configure the AI chatbot for the client portal" />
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="AI Chatbot" description="Configure the AI chatbot for the client portal" />

      {message && (
        <div
          className={`rounded-md px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Stats Overview */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_conversations}</div>
              <p className="text-xs text-muted-foreground">{stats.active_conversations} active</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.weekly_conversations}</div>
              <p className="text-xs text-muted-foreground">{stats.weekly_messages} messages</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Appointments Booked</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.weekly_appointments_booked}</div>
              <p className="text-xs text-muted-foreground">via chatbot this week</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Handed Off</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.handed_off_conversations}</div>
              <p className="text-xs text-muted-foreground">to human agents</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
          <TabsTrigger value="slots">Appointment Slots</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="mt-6">
          {config && (
            <ConfigurationForm
              config={config}
              onSave={(updated) => {
                setConfig(updated);
                setMessage({ type: "success", text: "Configuration saved successfully." });
              }}
              onError={(msg) => setMessage({ type: "error", text: msg })}
            />
          )}
        </TabsContent>

        <TabsContent value="knowledge" className="mt-6">
          <KnowledgeBaseSection entries={knowledge} onRefresh={refreshKnowledge} />
        </TabsContent>

        <TabsContent value="slots" className="mt-6">
          <AppointmentSlotsSection slots={slots} onRefresh={refreshSlots} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Configuration Form Component
function ConfigurationForm({
  config,
  onSave,
  onError,
}: {
  config: ChatbotConfiguration;
  onSave: (config: ChatbotConfiguration) => void;
  onError: (message: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    ai_provider: config.ai_provider,
    api_key: "",
    model_name: config.model_name,
    temperature: config.temperature,
    max_tokens: config.max_tokens,
    system_prompt: config.system_prompt,
    company_name: config.company_name,
    welcome_message: config.welcome_message,
    is_active: config.is_active,
    allow_appointments: config.allow_appointments,
    handoff_enabled: config.handoff_enabled,
    handoff_message: config.handoff_message,
    fallback_message: config.fallback_message,
    max_fallbacks_before_handoff: config.max_fallbacks_before_handoff,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFieldErrors({});
    try {
      const data = { ...formData };
      if (!data.api_key) {
        delete (data as Record<string, unknown>).api_key;
      }
      const updated = await updateChatbotConfig(data);
      onSave(updated);
    } catch (err: unknown) {
      // Extract validation errors from API response
      const error = err as { response?: { data?: Record<string, string[]> } };
      if (error.response?.data) {
        const errors: Record<string, string> = {};
        const errorData = error.response.data;

        // Build field-specific error messages
        for (const [field, messages] of Object.entries(errorData)) {
          if (Array.isArray(messages)) {
            errors[field] = messages.join(", ");
          } else if (typeof messages === "string") {
            errors[field] = messages;
          }
        }

        setFieldErrors(errors);

        // Build summary message
        const errorFields = Object.keys(errors);
        if (errorFields.length > 0) {
          onError(`Validation errors in: ${errorFields.join(", ")}`);
        } else {
          onError("Failed to save configuration");
        }
      } else {
        onError("Failed to save configuration");
      }
    } finally {
      setSaving(false);
    }
  };

  // Helper to render field error
  const renderError = (field: string) => {
    if (fieldErrors[field]) {
      return <p className="text-sm text-destructive mt-1">{fieldErrors[field]}</p>;
    }
    return null;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Provider Settings</CardTitle>
          <CardDescription>Configure the AI service for the chatbot</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>AI Provider</Label>
              <Select
                value={formData.ai_provider}
                onValueChange={(value: "openai" | "anthropic") =>
                  setFormData({ ...formData, ai_provider: value, model_name: AI_MODELS[value][0] })
                }
              >
                <SelectTrigger className={fieldErrors.ai_provider ? "border-destructive" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(AI_PROVIDER_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {renderError("ai_provider")}
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Select
                value={formData.model_name}
                onValueChange={(value) => setFormData({ ...formData, model_name: value })}
              >
                <SelectTrigger className={fieldErrors.model_name ? "border-destructive" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_MODELS[formData.ai_provider].map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {renderError("model_name")}
            </div>
          </div>

          <div className="space-y-2">
            <Label>API Key</Label>
            <Input
              type="password"
              placeholder={config.api_key_set ? "••••••••••••••••" : "Enter API key"}
              value={formData.api_key}
              onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
              className={fieldErrors.api_key ? "border-destructive" : ""}
            />
            {config.api_key_set && !fieldErrors.api_key && (
              <p className="text-xs text-muted-foreground">
                API key is set. Leave empty to keep current key.
              </p>
            )}
            {renderError("api_key")}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Temperature (0-1)</Label>
              <Input
                type="number"
                min={0}
                max={1}
                step={0.1}
                value={formData.temperature}
                onChange={(e) =>
                  setFormData({ ...formData, temperature: parseFloat(e.target.value) || 0 })
                }
                className={fieldErrors.temperature ? "border-destructive" : ""}
              />
              {!fieldErrors.temperature && (
                <p className="text-xs text-muted-foreground">
                  Lower = more focused, Higher = more creative
                </p>
              )}
              {renderError("temperature")}
            </div>
            <div className="space-y-2">
              <Label>Max Tokens</Label>
              <Input
                type="number"
                value={formData.max_tokens}
                onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) })}
                className={fieldErrors.max_tokens ? "border-destructive" : ""}
              />
              {renderError("max_tokens")}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chatbot Personality</CardTitle>
          <CardDescription>Customize the chatbot&apos;s behavior and responses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Company Name</Label>
            <Input
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className={fieldErrors.company_name ? "border-destructive" : ""}
            />
            {renderError("company_name")}
          </div>

          <div className="space-y-2">
            <Label>Welcome Message</Label>
            <Textarea
              value={formData.welcome_message}
              onChange={(e) => setFormData({ ...formData, welcome_message: e.target.value })}
              rows={2}
              className={fieldErrors.welcome_message ? "border-destructive" : ""}
            />
            {renderError("welcome_message")}
          </div>

          <div className="space-y-2">
            <Label>System Prompt (Additional Instructions)</Label>
            <Textarea
              value={formData.system_prompt}
              onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
              rows={4}
              placeholder="Add specific instructions about services, pricing, or behavior..."
              className={fieldErrors.system_prompt ? "border-destructive" : ""}
            />
            {renderError("system_prompt")}
          </div>

          <div className="space-y-2">
            <Label>Fallback Message</Label>
            <Textarea
              value={formData.fallback_message}
              onChange={(e) => setFormData({ ...formData, fallback_message: e.target.value })}
              rows={2}
              className={fieldErrors.fallback_message ? "border-destructive" : ""}
            />
            {!fieldErrors.fallback_message && (
              <p className="text-xs text-muted-foreground">Shown when the user asks about unrelated topics</p>
            )}
            {renderError("fallback_message")}
          </div>

          <div className="space-y-2">
            <Label>Handoff Message</Label>
            <Textarea
              value={formData.handoff_message}
              onChange={(e) => setFormData({ ...formData, handoff_message: e.target.value })}
              rows={2}
              className={fieldErrors.handoff_message ? "border-destructive" : ""}
            />
            {renderError("handoff_message")}
          </div>

          <div className="space-y-2">
            <Label>Max Fallbacks Before Handoff</Label>
            <Input
              type="number"
              value={formData.max_fallbacks_before_handoff}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  max_fallbacks_before_handoff: parseInt(e.target.value),
                })
              }
              className={fieldErrors.max_fallbacks_before_handoff ? "border-destructive" : ""}
            />
            {renderError("max_fallbacks_before_handoff")}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Chatbot Active</Label>
              <p className="text-sm text-muted-foreground">Enable or disable the chatbot for all portal users</p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Allow Appointment Booking</Label>
              <p className="text-sm text-muted-foreground">Let the chatbot schedule appointments</p>
            </div>
            <Switch
              checked={formData.allow_appointments}
              onCheckedChange={(checked) => setFormData({ ...formData, allow_appointments: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Human Handoff</Label>
              <p className="text-sm text-muted-foreground">Allow transferring to a human representative</p>
            </div>
            <Switch
              checked={formData.handoff_enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, handoff_enabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Configuration
        </Button>
      </div>
    </form>
  );
}

// Knowledge Base Section
function KnowledgeBaseSection({
  entries,
  onRefresh,
}: {
  entries: ChatbotKnowledgeEntry[];
  onRefresh: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ChatbotKnowledgeEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    entry_type: "general" as KnowledgeEntryType,
    title: "",
    content: "",
    keywords: "",
    priority: 0,
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      entry_type: "general",
      title: "",
      content: "",
      keywords: "",
      priority: 0,
      is_active: true,
    });
  };

  const handleEdit = (entry: ChatbotKnowledgeEntry) => {
    setEditingEntry(entry);
    setFormData({
      entry_type: entry.entry_type,
      title: entry.title,
      content: entry.content,
      keywords: entry.keywords,
      priority: entry.priority,
      is_active: entry.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      if (editingEntry) {
        await updateKnowledgeEntry(editingEntry.id, formData);
      } else {
        await createKnowledgeEntry(formData);
      }
      setDialogOpen(false);
      setEditingEntry(null);
      resetForm();
      onRefresh();
    } catch (err) {
      console.error("Failed to save knowledge entry", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteKnowledgeEntry(deleteId);
      setDeleteId(null);
      onRefresh();
    } catch (err) {
      console.error("Failed to delete knowledge entry", err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Knowledge Base</h3>
          <p className="text-sm text-muted-foreground">
            Add information that the chatbot will use to answer questions
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingEntry(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Entry
        </Button>
      </div>

      <div className="grid gap-4">
        {(Array.isArray(entries) ? entries : []).map((entry) => (
          <Card key={entry.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{entry.title}</CardTitle>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="secondary">{ENTRY_TYPE_LABELS[entry.entry_type]}</Badge>
                    {!entry.is_active && <Badge variant="outline">Inactive</Badge>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(entry)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(entry.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2">{entry.content}</p>
            </CardContent>
          </Card>
        ))}

        {entries.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No knowledge entries yet. Add entries to train the chatbot.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingEntry ? "Edit Entry" : "Add Knowledge Entry"}</DialogTitle>
            <DialogDescription>
              Add information that the chatbot will use to answer questions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.entry_type}
                  onValueChange={(value: KnowledgeEntryType) =>
                    setFormData({ ...formData, entry_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ENTRY_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Title / Question</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., What are your business hours?"
              />
            </div>

            <div className="space-y-2">
              <Label>Content / Answer</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={5}
                placeholder="Provide detailed information..."
              />
            </div>

            <div className="space-y-2">
              <Label>Keywords (comma-separated)</Label>
              <Input
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                placeholder="hours, schedule, open, close"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingEntry ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Knowledge Entry?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Appointment Slots Section
function AppointmentSlotsSection({
  slots,
  onRefresh,
}: {
  slots: ChatbotAppointmentSlot[];
  onRefresh: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    day_of_week: 0,
    start_time: "09:00",
    end_time: "17:00",
    slot_duration_minutes: 30,
    max_appointments: 1,
    is_active: true,
  });

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await createAppointmentSlot(formData);
      setDialogOpen(false);
      onRefresh();
    } catch (err) {
      console.error("Failed to create slot", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteAppointmentSlot(deleteId);
      setDeleteId(null);
      onRefresh();
    } catch (err) {
      console.error("Failed to delete slot", err);
    }
  };

  // Group slots by day
  const safeSlots = Array.isArray(slots) ? slots : [];
  const slotsByDay = safeSlots.reduce(
    (acc, slot) => {
      if (!acc[slot.day_of_week]) {
        acc[slot.day_of_week] = [];
      }
      acc[slot.day_of_week].push(slot);
      return acc;
    },
    {} as Record<number, ChatbotAppointmentSlot[]>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Appointment Slots</h3>
          <p className="text-sm text-muted-foreground">
            Define available time slots for chatbot appointment booking
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Slot
        </Button>
      </div>

      <div className="grid gap-4">
        {Object.entries(DAY_OF_WEEK_LABELS).map(([day, label]) => {
          const daySlots = slotsByDay[parseInt(day)] || [];
          return (
            <Card key={day}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                {daySlots.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {daySlots.map((slot) => (
                      <Badge
                        key={slot.id}
                        variant={slot.is_active ? "secondary" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setDeleteId(slot.id)}
                      >
                        {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                        <Trash2 className="ml-1 h-3 w-3" />
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No slots configured</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Slot Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Appointment Slot</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select
                value={formData.day_of_week.toString()}
                onValueChange={(value) => setFormData({ ...formData, day_of_week: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DAY_OF_WEEK_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Slot Duration (minutes)</Label>
                <Input
                  type="number"
                  value={formData.slot_duration_minutes}
                  onChange={(e) =>
                    setFormData({ ...formData, slot_duration_minutes: parseInt(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Max Appointments per Slot</Label>
                <Input
                  type="number"
                  value={formData.max_appointments}
                  onChange={(e) => setFormData({ ...formData, max_appointments: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Appointment Slot?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
