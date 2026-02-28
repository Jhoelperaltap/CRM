"use client";

import { useEffect, useState, useCallback } from "react";
import { getUserPreferences, updateUserPreferences, type UserPreferences } from "@/lib/api/dashboard";
import { useUIStore } from "@/stores/ui-store";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Monitor, Sparkles } from "lucide-react";

export default function PreferencesPage() {
  const setTheme = useUIStore((s) => s.setTheme);
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);
  const setUIMode = useUIStore((s) => s.setUIMode);
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchPrefs = useCallback(async () => {
    try {
      const data = await getUserPreferences();
      setPrefs(data);
      // Sync backend preferences to the UI store
      setTheme(data.theme === "dark" ? "dark" : "light");
      setSidebarCollapsed(data.sidebar_collapsed);
      setUIMode(data.ui_mode || "full");
    } catch (err) {
      console.error("Failed to load preferences", err);
    } finally {
      setLoading(false);
    }
  }, [setTheme, setSidebarCollapsed, setUIMode]);

  useEffect(() => {
    fetchPrefs();
  }, [fetchPrefs]);

  const handleSave = async () => {
    if (!prefs) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateUserPreferences({
        theme: prefs.theme,
        sidebar_collapsed: prefs.sidebar_collapsed,
        items_per_page: prefs.items_per_page,
        date_format: prefs.date_format,
        timezone: prefs.timezone,
        ui_mode: prefs.ui_mode,
      });
      setPrefs(updated);
      // Apply immediately to the UI
      setTheme(updated.theme === "dark" ? "dark" : "light");
      setSidebarCollapsed(updated.sidebar_collapsed);
      setUIMode(updated.ui_mode || "full");
      setMessage({ type: "success", text: "Preferences saved successfully." });
    } catch (err) {
      console.error("Failed to save preferences", err);
      setMessage({ type: "error", text: "Failed to save preferences." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Preferences"
          description="Manage your display and UI settings"
        />
        <LoadingSpinner />
      </div>
    );
  }

  if (!prefs) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Preferences"
          description="Manage your display and UI settings"
        />
        <p className="py-8 text-center text-muted-foreground">
          Unable to load preferences.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Preferences"
        description="Manage your display and UI settings"
      />

      {message && (
        <div
          className={`rounded-md px-4 py-3 text-sm ${
            message.type === "success"
              ? "border border-green-200 bg-green-50 text-green-800"
              : "border border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Interface Mode Card - Full Width */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Interface Mode
          </CardTitle>
          <CardDescription>
            Choose between the full-featured interface or a simplified light mode
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Select
              value={prefs.ui_mode}
              onValueChange={(v: "full" | "light") => setPrefs({ ...prefs, ui_mode: v })}
            >
              <SelectTrigger id="ui_mode" className="w-full md:w-[400px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    <div>
                      <span className="font-medium">Full Mode</span>
                      <span className="text-muted-foreground ml-2">
                        - All fields and features
                      </span>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <div>
                      <span className="font-medium">Light Mode</span>
                      <span className="text-muted-foreground ml-2">
                        - Simplified wizard interface
                      </span>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {prefs.ui_mode === "light"
                ? "Light Mode uses a step-by-step wizard for creating contacts and a simplified card-based view."
                : "Full Mode provides access to all fields and the traditional table-based interface."}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appearance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select
                value={prefs.theme}
                onValueChange={(v: "light" | "dark") => setPrefs({ ...prefs, theme: v })}
              >
                <SelectTrigger id="theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="sidebar">Sidebar collapsed</Label>
              <Switch
                id="sidebar"
                checked={prefs.sidebar_collapsed}
                onCheckedChange={(v) =>
                  setPrefs({ ...prefs, sidebar_collapsed: v })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Display</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="items">Items per page</Label>
              <Input
                id="items"
                type="number"
                min={10}
                max={100}
                value={prefs.items_per_page}
                onChange={(e) =>
                  setPrefs({
                    ...prefs,
                    items_per_page: parseInt(e.target.value, 10) || 25,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateFormat">Date format</Label>
              <Select
                value={prefs.date_format}
                onValueChange={(v) => setPrefs({ ...prefs, date_format: v })}
              >
                <SelectTrigger id="dateFormat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={prefs.timezone}
                onValueChange={(v) => setPrefs({ ...prefs, timezone: v })}
              >
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">
                    Eastern (New York)
                  </SelectItem>
                  <SelectItem value="America/Chicago">
                    Central (Chicago)
                  </SelectItem>
                  <SelectItem value="America/Denver">
                    Mountain (Denver)
                  </SelectItem>
                  <SelectItem value="America/Los_Angeles">
                    Pacific (Los Angeles)
                  </SelectItem>
                  <SelectItem value="America/Anchorage">
                    Alaska (Anchorage)
                  </SelectItem>
                  <SelectItem value="Pacific/Honolulu">
                    Hawaii (Honolulu)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </div>
  );
}
