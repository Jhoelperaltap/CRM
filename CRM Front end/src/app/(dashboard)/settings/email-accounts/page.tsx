"use client";

import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getEmailSettings,
  updateEmailSettings,
  resetEmailSettings,
} from "@/lib/api/emails";
import type { EmailSettingsData } from "@/types/email";

// Server type presets for auto-filling SMTP fields
const SERVER_PRESETS: Record<string, { smtp_host: string; smtp_port: number; smtp_use_tls: boolean }> = {
  gmail:     { smtp_host: "smtp.gmail.com",          smtp_port: 587,  smtp_use_tls: true },
  gsuite:    { smtp_host: "smtp.gmail.com",          smtp_port: 587,  smtp_use_tls: true },
  office365: { smtp_host: "smtp.office365.com",      smtp_port: 587,  smtp_use_tls: true },
  yahoo:     { smtp_host: "smtp.mail.yahoo.com",     smtp_port: 587,  smtp_use_tls: true },
};

const SECTIONS = [
  { id: "smtp",           label: "Mail Server Settings" },
  { id: "tracking",       label: "Email Tracking" },
  { id: "footer",         label: "Email Footer" },
  { id: "case-reply",     label: "Case Replies" },
  { id: "ticket-reply",   label: "Ticket Emails" },
  { id: "adhoc-reply",    label: "Ad Hoc Emails" },
  { id: "sys-notif",      label: "System Notifications" },
  { id: "font",           label: "Font" },
  { id: "opt-in",         label: "Opt-In Delivery" },
  { id: "customer-notif", label: "Customer Notifications" },
  { id: "undo-send",      label: "Undo Send" },
] as const;

export default function EmailSettingsPage() {
  const [settings, setSettings] = useState<EmailSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState("smtp");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getEmailSettings()
      .then((data) => setSettings(data as EmailSettingsData))
      .catch(() => alert("Failed to load email settings."))
      .finally(() => setLoading(false));
  }, []);

  // IntersectionObserver for auto-highlighting sidebar
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !settings) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        }
      },
      { root: container, threshold: 0.2 }
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [settings]);

  const set = <K extends keyof EmailSettingsData>(key: K, value: EmailSettingsData[K]) =>
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));

  const handleServerTypeChange = (type: string) => {
    set("server_type", type);
    const preset = SERVER_PRESETS[type];
    if (preset) {
      set("smtp_host", preset.smtp_host);
      set("smtp_port", preset.smtp_port);
      set("smtp_use_tls", preset.smtp_use_tls);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...settings };
      delete payload.updated_at;
      const updated = await updateEmailSettings(payload);
      setSettings(updated as EmailSettingsData);
    } catch {
      alert("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset all email settings to default values?")) return;
    try {
      const data = await resetEmailSettings();
      setSettings(data as EmailSettingsData);
    } catch {
      alert("Failed to reset settings.");
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!settings) return <p className="text-muted-foreground p-4">Failed to load settings.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Email Settings</h1>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
        <div className="text-sm text-blue-900 dark:text-blue-200">
          <p>This page allows you to choose an SMTP email server for sending all ad-hoc emails and workflow emails (not email campaigns).</p>
          <p className="mt-1"><strong>Note:</strong> Gmail & Office 365 do not allow FROM addresses to be overridden. With Gmail, Office 365, Outlook and Hotmail mail servers all emails will be sent from the SMTP user name chosen below.</p>
        </div>
      </div>

      <div className="flex h-[calc(100vh-16rem)]">
        {/* Section sidebar */}
        <nav className="hidden w-52 shrink-0 md:block border-r pr-2">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Sections</h3>
          <div className="space-y-0.5">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setActiveSection(s.id);
                  document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={`block w-full px-3 py-2 text-left text-sm transition-colors ${
                  activeSection === s.id
                    ? "border-l-[3px] border-primary bg-primary/10 font-medium text-primary"
                    : "border-l-[3px] border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Scrollable content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto pl-6">
          <div className="space-y-10 pb-6">

            {/* ── Mail Server Settings (SMTP) ── */}
            <section id="smtp" className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="text-lg font-semibold">Mail Server Settings (SMTP)</h2>
                <Button variant="outline" size="sm" onClick={handleReset}>Reset to Default</Button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Server Type</Label>
                  <Select value={settings.server_type} onValueChange={handleServerTypeChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gmail">Gmail</SelectItem>
                      <SelectItem value="gsuite">GSuite</SelectItem>
                      <SelectItem value="office365">Microsoft / Office365</SelectItem>
                      <SelectItem value="yahoo">Yahoo</SelectItem>
                      <SelectItem value="custom">Custom SMTP</SelectItem>
                      <SelectItem value="other">Others</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>SMTP Host</Label>
                  <Input value={settings.smtp_host} onChange={(e) => set("smtp_host", e.target.value)} placeholder="smtp.example.com" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>SMTP Port</Label>
                  <Input type="number" value={settings.smtp_port} onChange={(e) => set("smtp_port", Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input value={settings.smtp_username} onChange={(e) => set("smtp_username", e.target.value)} placeholder="user@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" placeholder="(unchanged)" onChange={(e) => {
                    if (e.target.value) {
                      setSettings((prev) => prev ? { ...prev, smtp_password: e.target.value } as EmailSettingsData & { smtp_password: string } : prev);
                    }
                  }} />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={settings.smtp_use_tls} onCheckedChange={(v) => set("smtp_use_tls", v)} />
                <Label>Use TLS</Label>
              </div>
            </section>

            {/* ── Enable Email Tracking ── */}
            <section id="tracking" className="space-y-4">
              <h2 className="text-lg font-semibold border-b pb-2">Enable Email Tracking</h2>
              <div className="flex items-center gap-3">
                <Switch checked={settings.email_tracking_enabled} onCheckedChange={(v) => set("email_tracking_enabled", v)} />
                <Label>Email Tracking</Label>
                <span className="text-xs text-muted-foreground">(Track when emails are opened by recipients)</span>
              </div>
            </section>

            {/* ── Email Footer ── */}
            <section id="footer" className="space-y-4">
              <h2 className="text-lg font-semibold border-b pb-2">Email Footer</h2>
              <div className="flex items-center gap-3">
                <Switch checked={settings.include_email_footer} onCheckedChange={(v) => set("include_email_footer", v)} />
                <Label>Include Email Footer</Label>
              </div>
              {settings.include_email_footer && (
                <div className="space-y-2">
                  <Label>Email Footer Text</Label>
                  <Input value={settings.email_footer_text} onChange={(e) => set("email_footer_text", e.target.value)} placeholder="Powered by CRM" />
                </div>
              )}
            </section>

            {/* ── Reply to address for Case replies ── */}
            <section id="case-reply" className="space-y-4">
              <h2 className="text-lg font-semibold border-b pb-2">Reply to Address for Case Replies</h2>
              <div className="space-y-3">
                {[
                  { value: "primary_email",  label: "User's Primary Email Address" },
                  { value: "group_email",    label: "User's Primary Group Email" },
                  { value: "outgoing_email", label: "Outgoing Email Address" },
                  { value: "helpdesk_email", label: "Helpdesk Email" },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="case_reply_to"
                      value={opt.value}
                      checked={settings.case_reply_to === opt.value}
                      onChange={() => set("case_reply_to", opt.value)}
                      className="h-4 w-4 text-primary"
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Switch checked={settings.case_allow_group_value} onCheckedChange={(v) => set("case_allow_group_value", v)} />
                <Label>Allow Case Record Group Value</Label>
              </div>
              <div className="space-y-2">
                <Label>BCC Address for Replies</Label>
                <Input value={settings.case_bcc_address} onChange={(e) => set("case_bcc_address", e.target.value)} placeholder="bcc@example.com" />
              </div>
            </section>

            {/* ── Reply to address for Internal Ticket Emails ── */}
            <section id="ticket-reply" className="space-y-4">
              <h2 className="text-lg font-semibold border-b pb-2">Reply to Address for Internal Ticket Emails</h2>
              <div className="space-y-3">
                {[
                  { value: "primary_email",  label: "User's Primary Email Address" },
                  { value: "group_email",    label: "User's Primary Group Email" },
                  { value: "outgoing_email", label: "Outgoing Email Address" },
                  { value: "ticket_email",   label: "Internal Ticket Email" },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="ticket_reply_to"
                      value={opt.value}
                      checked={settings.ticket_reply_to === opt.value}
                      onChange={() => set("ticket_reply_to", opt.value)}
                      className="h-4 w-4 text-primary"
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Reply-to Email Address</Label>
                  <Input value={settings.ticket_reply_to_address} onChange={(e) => set("ticket_reply_to_address", e.target.value)} placeholder="support@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>From Name</Label>
                  <Input value={settings.ticket_from_name} onChange={(e) => set("ticket_from_name", e.target.value)} placeholder="Support Team" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>BCC Address for Replies</Label>
                <Input value={settings.ticket_bcc_address} onChange={(e) => set("ticket_bcc_address", e.target.value)} placeholder="bcc@example.com" />
              </div>
            </section>

            {/* ── Reply-to for Ad Hoc Emails ── */}
            <section id="adhoc-reply" className="space-y-4">
              <h2 className="text-lg font-semibold border-b pb-2">Reply-to Address for Ad Hoc Emails</h2>
              <div className="space-y-3">
                {[
                  { value: "primary_email",  label: "User's Primary Email Address" },
                  { value: "group_email",    label: "User's Primary Group Email" },
                  { value: "outgoing_email", label: "Outgoing Email Address" },
                  { value: "other",          label: "Other" },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="adhoc_reply_to"
                      value={opt.value}
                      checked={settings.adhoc_reply_to === opt.value}
                      onChange={() => set("adhoc_reply_to", opt.value)}
                      className="h-4 w-4 text-primary"
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* ── System Notifications to Users ── */}
            <section id="sys-notif" className="space-y-4">
              <h2 className="text-lg font-semibold border-b pb-2">System Notifications to Users</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>From Name</Label>
                  <Input value={settings.sys_notif_from_name} onChange={(e) => set("sys_notif_from_name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>From and Reply-To Address</Label>
                  <Input value={settings.sys_notif_from_reply_to} onChange={(e) => set("sys_notif_from_reply_to", e.target.value)} placeholder="noreply@example.com" />
                </div>
              </div>
            </section>

            {/* ── Font ── */}
            <section id="font" className="space-y-4">
              <h2 className="text-lg font-semibold border-b pb-2">Font</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Font Family</Label>
                  <Select value={settings.email_font_family} onValueChange={(v) => set("email_font_family", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Arial">Arial</SelectItem>
                      <SelectItem value="Helvetica">Helvetica</SelectItem>
                      <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                      <SelectItem value="Georgia">Georgia</SelectItem>
                      <SelectItem value="Verdana">Verdana</SelectItem>
                      <SelectItem value="Courier New">Courier New</SelectItem>
                      <SelectItem value="Tahoma">Tahoma</SelectItem>
                      <SelectItem value="Trebuchet MS">Trebuchet MS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Font Size</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" min={8} max={32} value={settings.email_font_size} onChange={(e) => set("email_font_size", Number(e.target.value))} className="w-24" />
                    <span className="text-sm text-muted-foreground">px</span>
                  </div>
                </div>
              </div>
            </section>

            {/* ── Required Opt-In for Email Delivery ── */}
            <section id="opt-in" className="space-y-4">
              <h2 className="text-lg font-semibold border-b pb-2">Required Opt-In for Email Delivery</h2>
              <div className="space-y-2">
                <Label>Email Opt-in</Label>
                <Select value={settings.email_opt_in} onValueChange={(v) => set("email_opt_in", v)}>
                  <SelectTrigger className="max-w-md"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="double_single">Double opt-ins and Single User opt-ins</SelectItem>
                    <SelectItem value="single">Single opt-in</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  <Switch checked={settings.allow_adhoc_opted_out} onCheckedChange={(v) => set("allow_adhoc_opted_out", v)} />
                  <Label>Allow sending ad-hoc emails to contacts that have opted-out</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={settings.allow_workflow_opted_out} onCheckedChange={(v) => set("allow_workflow_opted_out", v)} />
                  <Label>Allow sending workflow emails to contacts that have opted-out</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={settings.auto_double_opt_in} onCheckedChange={(v) => set("auto_double_opt_in", v)} />
                  <Label>Automatically send a double opt-in email after webform submission</Label>
                </div>
              </div>
            </section>

            {/* ── System Notifications to Customers ── */}
            <section id="customer-notif" className="space-y-4">
              <h2 className="text-lg font-semibold border-b pb-2">System Notifications to Customers</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>From Name <span className="text-destructive">*</span></Label>
                  <Input value={settings.customer_notif_from_name} onChange={(e) => set("customer_notif_from_name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>From Email <span className="text-destructive">*</span></Label>
                  <Input type="email" value={settings.customer_notif_from_email} onChange={(e) => set("customer_notif_from_email", e.target.value)} />
                </div>
              </div>
            </section>

            {/* ── Undo Send ── */}
            <section id="undo-send" className="space-y-4">
              <h2 className="text-lg font-semibold border-b pb-2">Undo Send</h2>
              <div className="flex items-center gap-3">
                <Switch checked={settings.undo_send_enabled} onCheckedChange={(v) => set("undo_send_enabled", v)} />
                <Label>Enable Undo Send</Label>
              </div>
              {settings.undo_send_enabled && (
                <div className="space-y-2">
                  <Label>Undo Duration</Label>
                  <Select value={String(settings.undo_send_duration)} onValueChange={(v) => set("undo_send_duration", Number(v))}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 seconds</SelectItem>
                      <SelectItem value="10">10 seconds</SelectItem>
                      <SelectItem value="15">15 seconds</SelectItem>
                      <SelectItem value="30">30 seconds</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </section>

            {/* Save / Cancel */}
            <div className="flex items-center gap-3 border-t pt-4">
              <Button variant="outline" onClick={() => {
                setLoading(true);
                getEmailSettings()
                  .then((data) => setSettings(data as EmailSettingsData))
                  .finally(() => setLoading(false));
              }}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
