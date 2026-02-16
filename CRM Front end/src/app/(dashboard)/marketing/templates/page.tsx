"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import {
  Plus,
  Search,
  Copy,
  Pencil,
  Trash2,
  ChevronDown,
  FileText,
  Mail,
  MessageSquare,
  Save,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Template {
  id: string;
  name: string;
  description: string;
  type: "email" | "sms" | "notification";
  subject?: string;
  content: string;
  variables: string[];
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

const templateFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string(),
  type: z.enum(["email", "sms", "notification"]),
  subject: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  is_active: z.boolean(),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

// Extract variables from template content
function extractVariables(content: string, subject?: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const variables = new Set<string>();
  let match;

  while ((match = regex.exec(content)) !== null) {
    variables.add(match[1]);
  }

  if (subject) {
    const subjectRegex = /\{\{(\w+)\}\}/g;
    while ((match = subjectRegex.exec(subject)) !== null) {
      variables.add(match[1]);
    }
  }

  return Array.from(variables);
}

// Initial mock data
const initialTemplates: Template[] = [
  {
    id: "1",
    name: "Welcome Email",
    description: "Sent to new contacts upon registration",
    type: "email",
    subject: "Welcome to {{company_name}}!",
    content: "Hello {{first_name}},\n\nWelcome to our platform! We're excited to have you on board.\n\nBest regards,\n{{company_name}} Team",
    variables: ["first_name", "company_name"],
    is_active: true,
    usage_count: 234,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "2",
    name: "Appointment Reminder",
    description: "SMS reminder for upcoming appointments",
    type: "sms",
    content: "Hi {{first_name}}, reminder: your appointment is on {{date}} at {{time}}. Reply CONFIRM to confirm.",
    variables: ["first_name", "date", "time"],
    is_active: true,
    usage_count: 567,
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "3",
    name: "Case Update Notification",
    description: "Internal notification for case updates",
    type: "notification",
    content: "Case {{case_number}} has been updated by {{agent_name}}. Status: {{status}}",
    variables: ["case_number", "agent_name", "status"],
    is_active: false,
    usage_count: 89,
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function MarketingTemplatesPage() {
  const [loading, setLoading] = useState(true);
  const [allTemplates, setAllTemplates] = useState<Template[]>(initialTemplates);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [formDialog, setFormDialog] = useState<{
    open: boolean;
    template: Template | null;
  }>({ open: false, template: null });
  const [previewDialog, setPreviewDialog] = useState<{
    open: boolean;
    template: Template | null;
  }>({ open: false, template: null });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: string;
    name: string;
  }>({ open: false, id: "", name: "" });
  const [saving, setSaving] = useState(false);

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "email",
      subject: "",
      content: "",
      is_active: true,
    },
  });

  const watchType = form.watch("type");
  const watchContent = form.watch("content");
  const watchSubject = form.watch("subject");

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 300));
      let filtered = allTemplates.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase())
      );
      if (activeTab !== "all") {
        filtered = filtered.filter((t) => t.type === activeTab);
      }
      setTemplates(filtered);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, [search, activeTab, allTemplates]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const openFormDialog = (template?: Template) => {
    if (template) {
      form.reset({
        name: template.name,
        description: template.description,
        type: template.type,
        subject: template.subject || "",
        content: template.content,
        is_active: template.is_active,
      });
      setFormDialog({ open: true, template });
    } else {
      form.reset({
        name: "",
        description: "",
        type: "email",
        subject: "",
        content: "",
        is_active: true,
      });
      setFormDialog({ open: true, template: null });
    }
  };

  const handleSave = async (data: TemplateFormValues) => {
    setSaving(true);
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      const variables = extractVariables(data.content, data.subject);
      const now = new Date().toISOString();

      if (formDialog.template) {
        // Update existing
        setAllTemplates((prev) =>
          prev.map((t) =>
            t.id === formDialog.template!.id
              ? {
                  ...t,
                  ...data,
                  variables,
                  updated_at: now,
                }
              : t
          )
        );
      } else {
        // Create new
        const newTemplate: Template = {
          id: String(Date.now()),
          ...data,
          variables,
          usage_count: 0,
          created_at: now,
          updated_at: now,
        };
        setAllTemplates((prev) => [newTemplate, ...prev]);
      }

      setFormDialog({ open: false, template: null });
    } catch {
      /* empty */
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    const template = allTemplates.find((t) => t.id === id);
    if (template) {
      const now = new Date().toISOString();
      const newTemplate: Template = {
        ...template,
        id: String(Date.now()),
        name: `${template.name} (Copy)`,
        usage_count: 0,
        created_at: now,
        updated_at: now,
      };
      setAllTemplates((prev) => [newTemplate, ...prev]);
    }
  };

  const handleDelete = async () => {
    // TODO: Replace with actual API call
    setAllTemplates((prev) => prev.filter((t) => t.id !== deleteDialog.id));
    setDeleteDialog({ open: false, id: "", name: "" });
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    setAllTemplates((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, is_active: !isActive, updated_at: new Date().toISOString() } : t
      )
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="size-4" />;
      case "sms":
        return <MessageSquare className="size-4" />;
      case "notification":
        return <FileText className="size-4" />;
      default:
        return <FileText className="size-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      email: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
      sms: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
      notification: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    };
    return (
      <Badge variant="outline" className={`gap-1 ${colors[type] || ""}`}>
        {getTypeIcon(type)}
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  // Detected variables from current form content
  const detectedVariables = extractVariables(watchContent || "", watchSubject || "");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Message Templates</h1>
          <p className="text-muted-foreground">
            Create and manage reusable templates for emails, SMS, and notifications
          </p>
        </div>
        <Button onClick={() => openFormDialog()}>
          <Plus className="mr-2 size-4" />
          Create Template
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">All Templates</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="sms">SMS</TabsTrigger>
            <TabsTrigger value="notification">Notification</TabsTrigger>
          </TabsList>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <LoadingSpinner />
          ) : templates.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Variables</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div
                          className="cursor-pointer hover:underline"
                          onClick={() => openFormDialog(template)}
                        >
                          <div className="font-medium">{template.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {template.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(template.type)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {template.variables.slice(0, 2).map((v) => (
                            <Badge key={v} variant="secondary" className="text-xs">
                              {`{{${v}}}`}
                            </Badge>
                          ))}
                          {template.variables.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{template.variables.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={template.is_active ? "default" : "secondary"}
                          className={
                            template.is_active
                              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                              : ""
                          }
                        >
                          {template.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{template.usage_count}</TableCell>
                      <TableCell>
                        {format(new Date(template.updated_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <ChevronDown className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openFormDialog(template)}>
                              <Pencil className="mr-2 size-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setPreviewDialog({ open: true, template })}
                            >
                              <Eye className="mr-2 size-4" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDuplicate(template.id)}
                            >
                              <Copy className="mr-2 size-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(template.id, template.is_active)}
                            >
                              {template.is_active ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() =>
                                setDeleteDialog({
                                  open: true,
                                  id: template.id,
                                  name: template.name,
                                })
                              }
                            >
                              <Trash2 className="mr-2 size-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="size-12 text-muted-foreground mb-4" />
                <CardTitle className="mb-2">No Templates Found</CardTitle>
                <CardDescription className="text-center mb-4">
                  {search
                    ? "No templates match your search"
                    : "Create your first template to get started"}
                </CardDescription>
                <Button onClick={() => openFormDialog()}>
                  <Plus className="mr-2 size-4" />
                  Create Template
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog
        open={formDialog.open}
        onOpenChange={(open) => {
          if (!open) setFormDialog({ open: false, template: null });
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {formDialog.template ? "Edit Template" : "Create Template"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Template name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="email">
                            <div className="flex items-center gap-2">
                              <Mail className="size-4" />
                              Email
                            </div>
                          </SelectItem>
                          <SelectItem value="sms">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="size-4" />
                              SMS
                            </div>
                          </SelectItem>
                          <SelectItem value="notification">
                            <div className="flex items-center gap-2">
                              <FileText className="size-4" />
                              Notification
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief description of this template" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchType === "email" && (
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject Line</FormLabel>
                      <FormControl>
                        <Input placeholder="Email subject (use {{variable}} for dynamic content)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={`Enter your ${watchType} content here...\n\nUse {{variable_name}} for dynamic content, e.g.:\n- {{first_name}}\n- {{company_name}}\n- {{date}}`}
                        className="min-h-[200px] font-mono text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Use {"{{variable_name}}"} syntax for dynamic content that will be replaced when sending
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {detectedVariables.length > 0 && (
                <div className="rounded-lg border p-3 bg-muted/50">
                  <p className="text-sm font-medium mb-2">Detected Variables:</p>
                  <div className="flex flex-wrap gap-2">
                    {detectedVariables.map((v) => (
                      <Badge key={v} variant="secondary">
                        {`{{${v}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Active templates can be used in automations and manual sends
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormDialog({ open: false, template: null })}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  <Save className="mr-2 size-4" />
                  {saving ? "Saving..." : formDialog.template ? "Save Changes" : "Create Template"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={previewDialog.open}
        onOpenChange={(open) => {
          if (!open) setPreviewDialog({ open: false, template: null });
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewDialog.template && getTypeIcon(previewDialog.template.type)}
              {previewDialog.template?.name}
            </DialogTitle>
          </DialogHeader>
          {previewDialog.template && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {previewDialog.template.description}
              </p>

              {previewDialog.template.type === "email" && previewDialog.template.subject && (
                <div>
                  <p className="text-sm font-medium mb-1">Subject:</p>
                  <p className="text-sm bg-muted p-2 rounded">
                    {previewDialog.template.subject}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-1">Content:</p>
                <pre className="text-sm bg-muted p-4 rounded whitespace-pre-wrap font-mono">
                  {previewDialog.template.content}
                </pre>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Variables:</p>
                <div className="flex flex-wrap gap-2">
                  {previewDialog.template.variables.map((v) => (
                    <Badge key={v} variant="outline">
                      {`{{${v}}}`}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPreviewDialog({ open: false, template: null })}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                if (previewDialog.template) {
                  openFormDialog(previewDialog.template);
                  setPreviewDialog({ open: false, template: null });
                }
              }}
            >
              <Pencil className="mr-2 size-4" />
              Edit Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog({ open: false, id: "", name: "" });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <strong>{deleteDialog.name}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, id: "", name: "" })}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
