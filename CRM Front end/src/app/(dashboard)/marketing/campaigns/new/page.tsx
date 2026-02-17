"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Clock, Save, TestTube, AlertCircle, CheckCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  createCampaign,
  sendCampaign,
  scheduleCampaign,
  sendTestEmail,
  getEmailLists,
  getCampaignTemplates,
} from "@/lib/api/marketing";
import type { EmailList, CampaignTemplate } from "@/types/marketing";

const campaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  subject: z.string().min(1, "Subject line is required"),
  preview_text: z.string().optional(),
  from_name: z.string().min(1, "Sender name is required"),
  from_email: z.string().email("Valid email is required"),
  reply_to: z.string().email("Valid email is required").optional().or(z.literal("")),
  html_content: z.string().min(1, "Email content is required"),
  text_content: z.string().optional(),
  email_list_ids: z.array(z.string()).min(1, "Select at least one email list"),
  track_opens: z.boolean(),
  track_clicks: z.boolean(),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

export default function NewCampaignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [emailLists, setEmailLists] = useState<EmailList[]>([]);
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [testEmails, setTestEmails] = useState("");
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      from_name: "",
      from_email: "",
      track_opens: true,
      track_clicks: true,
      email_list_ids: [],
    },
  });

  const selectedLists = watch("email_list_ids");

  useEffect(() => {
    async function fetchData() {
      try {
        const [listsData, templatesData] = await Promise.all([
          getEmailLists({ is_active: true }),
          getCampaignTemplates({ is_active: true }),
        ]);
        setEmailLists(listsData);
        setTemplates(templatesData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    }
    fetchData();
  }, []);

  function handleTemplateChange(templateId: string) {
    setSelectedTemplate(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setValue("subject", template.subject);
      setValue("preview_text", template.preview_text);
      setValue("html_content", template.html_content);
      setValue("text_content", template.text_content);
    }
  }

  function toggleList(listId: string) {
    const current = selectedLists || [];
    if (current.includes(listId)) {
      setValue(
        "email_list_ids",
        current.filter((id) => id !== listId)
      );
    } else {
      setValue("email_list_ids", [...current, listId]);
    }
  }

  async function saveDraft(data: CampaignFormData) {
    setLoading(true);
    try {
      const campaign = await createCampaign({
        ...data,
        status: "draft" as const,
      });
      setCampaignId(campaign.id);
      setMessage({ type: "success", text: "Campaign saved as draft" });
      return campaign;
    } catch (error) {
      setMessage({ type: "error", text: "Failed to save campaign" });
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(data: CampaignFormData) {
    await saveDraft(data);
    router.push("/marketing/campaigns");
  }

  async function handleSendNow(data: CampaignFormData) {
    setLoading(true);
    try {
      let id = campaignId;
      if (!id) {
        const campaign = await saveDraft(data);
        id = campaign.id;
      }
      await sendCampaign(id);
      setMessage({ type: "success", text: "Campaign is being sent!" });
      router.push(`/marketing/campaigns/${id}`);
    } catch (error) {
      setMessage({ type: "error", text: "Failed to send campaign" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSchedule() {
    if (!scheduleDate) {
      setMessage({ type: "error", text: "Please select a date and time" });
      return;
    }

    setLoading(true);
    try {
      const data = watch();
      let id = campaignId;
      if (!id) {
        const campaign = await createCampaign({
          ...data,
          status: "draft" as const,
        });
        id = campaign.id;
      }
      await scheduleCampaign(id, new Date(scheduleDate).toISOString());
      setMessage({ type: "success", text: "Campaign scheduled!" });
      router.push(`/marketing/campaigns/${id}`);
    } catch (error) {
      setMessage({ type: "error", text: "Failed to schedule campaign" });
    } finally {
      setLoading(false);
      setShowScheduleDialog(false);
    }
  }

  async function handleTestSend() {
    const emails = testEmails.split(",").map((e) => e.trim()).filter(Boolean);
    if (emails.length === 0) {
      setMessage({ type: "error", text: "Please enter at least one email address" });
      return;
    }

    setLoading(true);
    try {
      const data = watch();
      let id = campaignId;
      if (!id) {
        const campaign = await createCampaign({
          ...data,
          status: "draft" as const,
        });
        id = campaign.id;
        setCampaignId(id);
      }
      const result = await sendTestEmail(id, emails);
      setMessage({ type: "success", text: `Test email sent to ${result.sent_to.length} addresses` });
    } catch (error) {
      setMessage({ type: "error", text: "Failed to send test email" });
    } finally {
      setLoading(false);
      setShowTestDialog(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/marketing/campaigns">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">New Campaign</h1>
          <p className="text-muted-foreground">
            Create a new email campaign
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowTestDialog(true)}
            disabled={loading}
          >
            <TestTube className="mr-2 h-4 w-4" />
            Test
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowScheduleDialog(true)}
            disabled={loading}
          >
            <Clock className="mr-2 h-4 w-4" />
            Schedule
          </Button>
          <Button
            variant="outline"
            onClick={handleSubmit(onSubmit)}
            disabled={loading}
          >
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          <Button
            onClick={handleSubmit(handleSendNow)}
            disabled={loading}
          >
            <Send className="mr-2 h-4 w-4" />
            Send Now
          </Button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"}>
          {message.type === "error" ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Campaign Details */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Tax Season 2025 Newsletter"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="template">Start from Template (optional)</Label>
                <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No template</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Email Content */}
          <Card>
            <CardHeader>
              <CardTitle>Email Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject Line</Label>
                <Input
                  id="subject"
                  placeholder="e.g., Important Tax Updates for 2025"
                  {...register("subject")}
                />
                {errors.subject && (
                  <p className="text-sm text-destructive">{errors.subject.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="preview_text">Preview Text</Label>
                <Input
                  id="preview_text"
                  placeholder="Text shown in email preview (optional)"
                  {...register("preview_text")}
                />
              </div>

              <Tabs defaultValue="html" className="w-full">
                <TabsList>
                  <TabsTrigger value="html">HTML Content</TabsTrigger>
                  <TabsTrigger value="text">Plain Text</TabsTrigger>
                </TabsList>
                <TabsContent value="html" className="space-y-2">
                  <Label htmlFor="html_content">HTML Email Content</Label>
                  <Textarea
                    id="html_content"
                    placeholder="<html>...</html>"
                    className="min-h-[300px] font-mono text-sm"
                    {...register("html_content")}
                  />
                  {errors.html_content && (
                    <p className="text-sm text-destructive">{errors.html_content.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Use {"{{contact.first_name}}"}, {"{{contact.last_name}}"}, {"{{contact.email}}"} for personalization
                  </p>
                </TabsContent>
                <TabsContent value="text" className="space-y-2">
                  <Label htmlFor="text_content">Plain Text Version</Label>
                  <Textarea
                    id="text_content"
                    placeholder="Plain text version of your email..."
                    className="min-h-[300px]"
                    {...register("text_content")}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Sender Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Sender Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="from_name">From Name</Label>
                <Input id="from_name" {...register("from_name")} />
                {errors.from_name && (
                  <p className="text-sm text-destructive">{errors.from_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="from_email">From Email</Label>
                <Input id="from_email" type="email" {...register("from_email")} />
                {errors.from_email && (
                  <p className="text-sm text-destructive">{errors.from_email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reply_to">Reply-To (optional)</Label>
                <Input id="reply_to" type="email" {...register("reply_to")} />
              </div>
            </CardContent>
          </Card>

          {/* Recipients */}
          <Card>
            <CardHeader>
              <CardTitle>Recipients</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select the email lists to send this campaign to
              </p>
              {errors.email_list_ids && (
                <p className="text-sm text-destructive">{errors.email_list_ids.message}</p>
              )}
              {emailLists.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p>No email lists available</p>
                  <Button variant="link" asChild className="mt-2">
                    <Link href="/marketing/lists">Create a list</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {emailLists.map((list) => (
                    <div
                      key={list.id}
                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
                      onClick={() => toggleList(list.id)}
                    >
                      <Checkbox
                        checked={selectedLists?.includes(list.id)}
                        onCheckedChange={() => toggleList(list.id)}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{list.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {list.subscriber_count} subscribers
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tracking */}
          <Card>
            <CardHeader>
              <CardTitle>Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="track_opens"
                  checked={watch("track_opens")}
                  onCheckedChange={(checked) => setValue("track_opens", !!checked)}
                />
                <Label htmlFor="track_opens">Track email opens</Label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="track_clicks"
                  checked={watch("track_clicks")}
                  onCheckedChange={(checked) => setValue("track_clicks", !!checked)}
                />
                <Label htmlFor="track_clicks">Track link clicks</Label>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>

      {/* Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="schedule_date">Send Date & Time</Label>
              <Input
                id="schedule_date"
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSchedule} disabled={loading}>
              <Clock className="mr-2 h-4 w-4" />
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Email Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="test_emails">Email Addresses</Label>
              <Input
                id="test_emails"
                placeholder="email1@example.com, email2@example.com"
                value={testEmails}
                onChange={(e) => setTestEmails(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Separate multiple addresses with commas
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleTestSend} disabled={loading}>
              <TestTube className="mr-2 h-4 w-4" />
              Send Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
