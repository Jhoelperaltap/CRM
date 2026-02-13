"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/lib/api/notifications";
import { NotificationPreference } from "@/types/notifications";

const typeLabels: Record<string, string> = {
  workflow_triggered: "Workflow Triggered",
  case_status_changed: "Case Status Changed",
  email_assigned: "Email Assigned",
  email_no_reply: "Email No Reply",
  appointment_reminder: "Appointment Reminder",
  task_overdue: "Task Overdue",
  document_missing: "Document Missing",
  case_due_date: "Case Due Date",
  system: "System",
};

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getNotificationPreferences()
      .then(setPrefs)
      .finally(() => setLoading(false));
  }, []);

  const toggle = (
    type: string,
    field: "in_app_enabled" | "email_enabled"
  ) => {
    setPrefs((prev) =>
      prev.map((p) =>
        p.notification_type === type ? { ...p, [field]: !p[field] } : p
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateNotificationPreferences(
        prefs.map((p) => ({
          notification_type: p.notification_type,
          in_app_enabled: p.in_app_enabled,
          email_enabled: p.email_enabled,
        }))
      );
      setPrefs(updated);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Notification Preferences"
        actions={
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Delivery Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-[1fr_80px_80px] gap-2 text-xs font-medium text-muted-foreground border-b pb-2">
              <span>Notification Type</span>
              <span className="text-center">In-App</span>
              <span className="text-center">Email</span>
            </div>
            {prefs.map((pref) => (
              <div
                key={pref.notification_type}
                className="grid grid-cols-[1fr_80px_80px] gap-2 items-center"
              >
                <span className="text-sm">
                  {typeLabels[pref.notification_type] || pref.notification_type}
                </span>
                <div className="flex justify-center">
                  <Switch
                    checked={pref.in_app_enabled}
                    onCheckedChange={() =>
                      toggle(pref.notification_type, "in_app_enabled")
                    }
                  />
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={pref.email_enabled}
                    onCheckedChange={() =>
                      toggle(pref.notification_type, "email_enabled")
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
