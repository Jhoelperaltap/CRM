"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Brain,
  Calendar,
  CheckCircle,
  Clock,
  Mail,
  Settings,
  Sparkles,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

import {
  getConfiguration,
  updateConfiguration,
  toggleAgent,
  getStatus,
} from "@/lib/api/ai-agent";
import type { AgentConfiguration, AgentStatus, AIProvider } from "@/types/ai-agent";

interface FormData {
  is_active: boolean;
  email_analysis_enabled: boolean;
  appointment_reminders_enabled: boolean;
  task_enforcement_enabled: boolean;
  market_analysis_enabled: boolean;
  autonomous_actions_enabled: boolean;
  email_check_interval_minutes: number;
  task_reminder_hours_before: number;
  appointment_reminder_hours: string;
  ai_provider: AIProvider;
  ai_model: string;
  ai_temperature: number;
  max_tokens: number;
  openai_api_key: string;
  anthropic_api_key: string;
  custom_instructions: string;
  focus_areas: string;
  max_actions_per_hour: number;
  max_ai_calls_per_hour: number;
}

export default function AIAgentSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<AgentConfiguration | null>(null);
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formData, setFormData] = useState<FormData>({
    is_active: false,
    email_analysis_enabled: false,
    appointment_reminders_enabled: true,
    task_enforcement_enabled: false,
    market_analysis_enabled: false,
    autonomous_actions_enabled: false,
    email_check_interval_minutes: 15,
    task_reminder_hours_before: 24,
    appointment_reminder_hours: "24, 2",
    ai_provider: "openai",
    ai_model: "gpt-4o",
    ai_temperature: 0.3,
    max_tokens: 2000,
    openai_api_key: "",
    anthropic_api_key: "",
    custom_instructions: "",
    focus_areas: "",
    max_actions_per_hour: 100,
    max_ai_calls_per_hour: 50,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [configData, statusData] = await Promise.all([
        getConfiguration(),
        getStatus(),
      ]);
      setConfig(configData);
      setStatus(statusData);

      setFormData({
        ...configData,
        appointment_reminder_hours: configData.appointment_reminder_hours.join(", "),
        focus_areas: configData.focus_areas.join(", "),
        openai_api_key: "",
        anthropic_api_key: "",
      });
    } catch (err) {
      console.error("Failed to fetch configuration:", err);
      setMessage({ type: "error", text: "Failed to load AI Agent configuration" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleToggle = async () => {
    try {
      const result = await toggleAgent();
      setConfig((prev) => (prev ? { ...prev, is_active: result.is_active } : null));
      setStatus((prev) => (prev ? { ...prev, is_active: result.is_active } : null));
      setFormData((prev) => ({ ...prev, is_active: result.is_active }));
      setMessage({
        type: "success",
        text: result.is_active ? "AI Agent activated" : "AI Agent deactivated",
      });
    } catch (err) {
      console.error("Failed to toggle agent:", err);
      setMessage({ type: "error", text: "Failed to toggle AI Agent" });
    }
  };

  const handleChange = (field: keyof FormData, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Parse comma-separated values
      const reminderHours = formData.appointment_reminder_hours
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n));

      const focusAreas = formData.focus_areas
        ? formData.focus_areas
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      const payload: Record<string, unknown> = {
        ...formData,
        appointment_reminder_hours: reminderHours,
        focus_areas: focusAreas,
      };

      // Only include API keys if they were changed
      if (!formData.openai_api_key) delete payload.openai_api_key;
      if (!formData.anthropic_api_key) delete payload.anthropic_api_key;

      const updated = await updateConfiguration(payload);
      setConfig(updated);
      setMessage({ type: "success", text: "AI Agent configuration saved successfully" });
    } catch (err) {
      console.error("Failed to save configuration:", err);
      setMessage({ type: "error", text: "Failed to save configuration" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Agent</h1>
          <p className="text-muted-foreground">
            Configure the autonomous AI assistant for your CRM
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge
            variant={config?.is_active ? "default" : "secondary"}
            className="text-sm"
          >
            {config?.is_active ? "Active" : "Inactive"}
          </Badge>
          <Button
            variant={config?.is_active ? "destructive" : "default"}
            onClick={handleToggle}
          >
            {config?.is_active ? "Deactivate" : "Activate"} Agent
          </Button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Status Overview */}
      {status && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {status.health === "healthy" ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Zap className="h-5 w-5 text-yellow-500" />
                )}
                <span className="text-2xl font-bold capitalize">{status.health}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Actions (Last Hour)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status.activity.actions_last_hour}</div>
              <p className="text-xs text-muted-foreground">
                {status.rate_limits.actions_remaining} remaining
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Approvals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status.activity.pending_actions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Errors (Last Hour)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status.activity.errors_last_hour}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Configuration Tabs */}
      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="capabilities" className="space-y-4">
          <TabsList>
            <TabsTrigger value="capabilities">
              <Sparkles className="mr-2 h-4 w-4" />
              Capabilities
            </TabsTrigger>
            <TabsTrigger value="ai">
              <Brain className="mr-2 h-4 w-4" />
              AI Settings
            </TabsTrigger>
            <TabsTrigger value="timing">
              <Clock className="mr-2 h-4 w-4" />
              Timing
            </TabsTrigger>
            <TabsTrigger value="advanced">
              <Settings className="mr-2 h-4 w-4" />
              Advanced
            </TabsTrigger>
          </TabsList>

          {/* Capabilities Tab */}
          <TabsContent value="capabilities">
            <Card>
              <CardHeader>
                <CardTitle>Agent Capabilities</CardTitle>
                <CardDescription>
                  Enable or disable specific AI agent features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-4">
                    <Mail className="h-8 w-8 text-blue-500" />
                    <div>
                      <Label className="text-base">Email Analysis</Label>
                      <p className="text-sm text-muted-foreground">
                        Analyze incoming emails and create notes from important content
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.email_analysis_enabled}
                    onCheckedChange={(checked) => handleChange("email_analysis_enabled", checked)}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-4">
                    <Calendar className="h-8 w-8 text-green-500" />
                    <div>
                      <Label className="text-base">Appointment Reminders</Label>
                      <p className="text-sm text-muted-foreground">
                        Send automated reminders for upcoming appointments
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.appointment_reminders_enabled}
                    onCheckedChange={(checked) => handleChange("appointment_reminders_enabled", checked)}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-4">
                    <CheckCircle className="h-8 w-8 text-orange-500" />
                    <div>
                      <Label className="text-base">Task Enforcement</Label>
                      <p className="text-sm text-muted-foreground">
                        Monitor task completion and send reminders/escalations
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.task_enforcement_enabled}
                    onCheckedChange={(checked) => handleChange("task_enforcement_enabled", checked)}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-4">
                    <Sparkles className="h-8 w-8 text-purple-500" />
                    <div>
                      <Label className="text-base">Market Analysis</Label>
                      <p className="text-sm text-muted-foreground">
                        Analyze business metrics and generate insights daily
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.market_analysis_enabled}
                    onCheckedChange={(checked) => handleChange("market_analysis_enabled", checked)}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4 border-yellow-200 bg-yellow-50">
                  <div className="flex items-center gap-4">
                    <Zap className="h-8 w-8 text-yellow-600" />
                    <div>
                      <Label className="text-base">Autonomous Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow AI to execute actions without manual approval (use with caution)
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.autonomous_actions_enabled}
                    onCheckedChange={(checked) => handleChange("autonomous_actions_enabled", checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Settings Tab */}
          <TabsContent value="ai">
            <Card>
              <CardHeader>
                <CardTitle>AI Configuration</CardTitle>
                <CardDescription>
                  Configure the AI provider and model settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ai_provider">AI Provider</Label>
                    <Select
                      value={formData.ai_provider}
                      onValueChange={(value) => handleChange("ai_provider", value as AIProvider)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                        <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ai_model">Model</Label>
                    <Input
                      id="ai_model"
                      value={formData.ai_model}
                      onChange={(e) => handleChange("ai_model", e.target.value)}
                      placeholder="gpt-4o"
                    />
                    <p className="text-xs text-muted-foreground">
                      e.g., gpt-4o, gpt-4-turbo, claude-3-opus-20240229
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai_temperature">
                    Temperature: {formData.ai_temperature}
                  </Label>
                  <Input
                    id="ai_temperature"
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={formData.ai_temperature}
                    onChange={(e) => handleChange("ai_temperature", parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Lower = more deterministic, Higher = more creative
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_tokens">Max Tokens</Label>
                  <Input
                    id="max_tokens"
                    type="number"
                    value={formData.max_tokens}
                    onChange={(e) => handleChange("max_tokens", parseInt(e.target.value, 10))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum tokens for AI responses (100-4000)
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="openai_api_key">OpenAI API Key</Label>
                    <Input
                      id="openai_api_key"
                      type="password"
                      value={formData.openai_api_key}
                      onChange={(e) => handleChange("openai_api_key", e.target.value)}
                      placeholder="sk-..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave blank to keep existing key
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="anthropic_api_key">Anthropic API Key</Label>
                    <Input
                      id="anthropic_api_key"
                      type="password"
                      value={formData.anthropic_api_key}
                      onChange={(e) => handleChange("anthropic_api_key", e.target.value)}
                      placeholder="sk-ant-..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave blank to keep existing key
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custom_instructions">Custom Instructions</Label>
                  <Textarea
                    id="custom_instructions"
                    value={formData.custom_instructions}
                    onChange={(e) => handleChange("custom_instructions", e.target.value)}
                    placeholder="Additional instructions for the AI agent..."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Custom context or rules for the AI to follow
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="focus_areas">Focus Areas</Label>
                  <Input
                    id="focus_areas"
                    value={formData.focus_areas}
                    onChange={(e) => handleChange("focus_areas", e.target.value)}
                    placeholder="revenue, client_retention, efficiency"
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated list of priority areas for analysis
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Timing Tab */}
          <TabsContent value="timing">
            <Card>
              <CardHeader>
                <CardTitle>Timing Settings</CardTitle>
                <CardDescription>
                  Configure when and how often the agent performs actions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email_check_interval_minutes">
                    Email Check Interval (minutes)
                  </Label>
                  <Input
                    id="email_check_interval_minutes"
                    type="number"
                    value={formData.email_check_interval_minutes}
                    onChange={(e) => handleChange("email_check_interval_minutes", parseInt(e.target.value, 10))}
                  />
                  <p className="text-xs text-muted-foreground">
                    How often to check for new emails to analyze (5-60 minutes)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appointment_reminder_hours">
                    Appointment Reminder Hours
                  </Label>
                  <Input
                    id="appointment_reminder_hours"
                    value={formData.appointment_reminder_hours}
                    onChange={(e) => handleChange("appointment_reminder_hours", e.target.value)}
                    placeholder="24, 2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated hours before appointment to send reminders (e.g., 24, 2 = 24h and 2h before)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="task_reminder_hours_before">
                    Task Reminder Hours
                  </Label>
                  <Input
                    id="task_reminder_hours_before"
                    type="number"
                    value={formData.task_reminder_hours_before}
                    onChange={(e) => handleChange("task_reminder_hours_before", parseInt(e.target.value, 10))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Hours before due date to send task reminders (1-72)
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced">
            <Card>
              <CardHeader>
                <CardTitle>Rate Limiting</CardTitle>
                <CardDescription>
                  Control how many actions the agent can perform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="max_actions_per_hour">Max Actions per Hour</Label>
                  <Input
                    id="max_actions_per_hour"
                    type="number"
                    value={formData.max_actions_per_hour}
                    onChange={(e) => handleChange("max_actions_per_hour", parseInt(e.target.value, 10))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of actions the agent can create per hour (10-500)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_ai_calls_per_hour">Max AI Calls per Hour</Label>
                  <Input
                    id="max_ai_calls_per_hour"
                    type="number"
                    value={formData.max_ai_calls_per_hour}
                    onChange={(e) => handleChange("max_ai_calls_per_hour", parseInt(e.target.value, 10))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of AI API calls per hour (10-200)
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
