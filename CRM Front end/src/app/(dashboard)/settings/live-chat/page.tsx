"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Save, Plus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  chatWidgetSettingsApi,
  chatDepartmentApi,
  cannedResponseApi,
} from "@/lib/api/live-chat";
import type {
  ChatWidgetSettings,
  ChatDepartment,
  CannedResponse,
} from "@/types/live-chat";

const widgetSettingsSchema = z.object({
  primary_color: z.string(),
  position: z.enum(["bottom-right", "bottom-left"]),
  company_name: z.string().min(1),
  welcome_message: z.string(),
  away_message: z.string(),
  require_name: z.boolean(),
  require_email: z.boolean(),
  require_phone: z.boolean(),
  require_department: z.boolean(),
  auto_popup: z.boolean(),
  auto_popup_delay: z.number().min(0),
  play_sound: z.boolean(),
  show_agent_photo: z.boolean(),
  show_typing_indicator: z.boolean(),
  file_upload_enabled: z.boolean(),
  max_file_size_mb: z.number().min(1).max(50),
  enable_rating: z.boolean(),
  rating_prompt: z.string(),
  offer_transcript: z.boolean(),
});

type WidgetSettingsValues = z.infer<typeof widgetSettingsSchema>;

export default function LiveChatSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [departments, setDepartments] = useState<ChatDepartment[]>([]);
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);

  const [deptDialog, setDeptDialog] = useState<{
    open: boolean;
    dept: ChatDepartment | null;
  }>({ open: false, dept: null });
  const [cannedDialog, setCannedDialog] = useState<{
    open: boolean;
    response: CannedResponse | null;
  }>({ open: false, response: null });

  const [deptForm, setDeptForm] = useState({
    name: "",
    description: "",
    is_active: true,
    auto_assign: true,
    max_concurrent_chats: 5,
    offline_message: "We're currently offline. Please leave a message.",
  });

  const [cannedForm, setCannedForm] = useState({
    title: "",
    shortcut: "",
    content: "",
    is_global: true,
    is_active: true,
  });

  const form = useForm<WidgetSettingsValues>({
    resolver: zodResolver(widgetSettingsSchema),
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settings, depts, responses] = await Promise.all([
          chatWidgetSettingsApi.get(),
          chatDepartmentApi.list(),
          cannedResponseApi.list(),
        ]);

        form.reset({
          primary_color: settings.primary_color,
          position: settings.position,
          company_name: settings.company_name,
          welcome_message: settings.welcome_message,
          away_message: settings.away_message,
          require_name: settings.require_name,
          require_email: settings.require_email,
          require_phone: settings.require_phone,
          require_department: settings.require_department,
          auto_popup: settings.auto_popup,
          auto_popup_delay: settings.auto_popup_delay,
          play_sound: settings.play_sound,
          show_agent_photo: settings.show_agent_photo,
          show_typing_indicator: settings.show_typing_indicator,
          file_upload_enabled: settings.file_upload_enabled,
          max_file_size_mb: settings.max_file_size_mb,
          enable_rating: settings.enable_rating,
          rating_prompt: settings.rating_prompt,
          offer_transcript: settings.offer_transcript,
        });

        setDepartments(depts);
        setCannedResponses(responses);
      } catch {
        setError("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [form]);

  const onSubmit = async (data: WidgetSettingsValues) => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await chatWidgetSettingsApi.update(data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDepartment = async () => {
    try {
      if (deptDialog.dept) {
        await chatDepartmentApi.update(deptDialog.dept.id, deptForm);
      } else {
        await chatDepartmentApi.create(deptForm);
      }
      const depts = await chatDepartmentApi.list();
      setDepartments(depts);
      setDeptDialog({ open: false, dept: null });
    } catch {
      setError("Failed to save department");
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    try {
      await chatDepartmentApi.delete(id);
      setDepartments(departments.filter((d) => d.id !== id));
    } catch {
      setError("Failed to delete department");
    }
  };

  const handleSaveCannedResponse = async () => {
    try {
      if (cannedDialog.response) {
        await cannedResponseApi.update(cannedDialog.response.id, cannedForm);
      } else {
        await cannedResponseApi.create(cannedForm);
      }
      const responses = await cannedResponseApi.list();
      setCannedResponses(responses);
      setCannedDialog({ open: false, response: null });
    } catch {
      setError("Failed to save canned response");
    }
  };

  const handleDeleteCannedResponse = async (id: string) => {
    try {
      await cannedResponseApi.delete(id);
      setCannedResponses(cannedResponses.filter((r) => r.id !== id));
    } catch {
      setError("Failed to delete canned response");
    }
  };

  const openDeptDialog = (dept?: ChatDepartment) => {
    if (dept) {
      setDeptForm({
        name: dept.name,
        description: dept.description,
        is_active: dept.is_active,
        auto_assign: dept.auto_assign,
        max_concurrent_chats: dept.max_concurrent_chats,
        offline_message: dept.offline_message,
      });
    } else {
      setDeptForm({
        name: "",
        description: "",
        is_active: true,
        auto_assign: true,
        max_concurrent_chats: 5,
        offline_message: "We're currently offline. Please leave a message.",
      });
    }
    setDeptDialog({ open: true, dept: dept || null });
  };

  const openCannedDialog = (response?: CannedResponse) => {
    if (response) {
      setCannedForm({
        title: response.title,
        shortcut: response.shortcut,
        content: response.content,
        is_global: response.is_global,
        is_active: response.is_active,
      });
    } else {
      setCannedForm({
        title: "",
        shortcut: "",
        content: "",
        is_global: true,
        is_active: true,
      });
    }
    setCannedDialog({ open: true, response: response || null });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Live Chat Settings</h1>
        <p className="text-muted-foreground">
          Configure your live chat widget and support settings
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">
            Settings saved successfully
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="widget">
        <TabsList>
          <TabsTrigger value="widget">Widget</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="canned">Canned Responses</TabsTrigger>
        </TabsList>

        <TabsContent value="widget" className="space-y-6 mt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>
                    Customize how the chat widget looks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="company_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="primary_color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Color</FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <input
                                type="color"
                                {...field}
                                className="h-10 w-14 rounded border cursor-pointer"
                              />
                              <Input {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Widget Position</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="bottom-right">
                              Bottom Right
                            </SelectItem>
                            <SelectItem value="bottom-left">
                              Bottom Left
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Messages</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="welcome_message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Welcome Message</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} />
                        </FormControl>
                        <FormDescription>
                          Shown when visitor opens the chat widget
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="away_message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Away Message</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} />
                        </FormControl>
                        <FormDescription>
                          Shown when no agents are online
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pre-Chat Form</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-6">
                    <FormField
                      control={form.control}
                      name="require_name"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Require Name
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="require_email"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Require Email
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="require_phone"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Require Phone
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="require_department"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Department Selection
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Features</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-6">
                    <FormField
                      control={form.control}
                      name="file_upload_enabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Allow File Uploads
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="show_typing_indicator"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Typing Indicator
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="play_sound"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Sound Notifications
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="enable_rating"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Chat Rating
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="offer_transcript"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Offer Transcript
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  <Save className="mr-2 size-4" />
                  {saving ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="departments" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Departments</CardTitle>
                <CardDescription>
                  Organize chats by department for routing
                </CardDescription>
              </div>
              <Button onClick={() => openDeptDialog()}>
                <Plus className="mr-2 size-4" />
                Add Department
              </Button>
            </CardHeader>
            <CardContent>
              {departments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Auto Assign</TableHead>
                      <TableHead>Online Agents</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departments.map((dept) => (
                      <TableRow key={dept.id}>
                        <TableCell className="font-medium">
                          {dept.name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={dept.is_active ? "default" : "secondary"}
                          >
                            {dept.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>{dept.auto_assign ? "Yes" : "No"}</TableCell>
                        <TableCell>{dept.online_agents_count}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeptDialog(dept)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => handleDeleteDepartment(dept.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No departments created yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="canned" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Canned Responses</CardTitle>
                <CardDescription>
                  Quick reply templates for common responses
                </CardDescription>
              </div>
              <Button onClick={() => openCannedDialog()}>
                <Plus className="mr-2 size-4" />
                Add Response
              </Button>
            </CardHeader>
            <CardContent>
              {cannedResponses.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Shortcut</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cannedResponses.map((response) => (
                      <TableRow key={response.id}>
                        <TableCell className="font-medium">
                          {response.title}
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-muted px-1 rounded">
                            /{response.shortcut}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={response.is_active ? "default" : "secondary"}
                          >
                            {response.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>{response.usage_count}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openCannedDialog(response)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() =>
                                handleDeleteCannedResponse(response.id)
                              }
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No canned responses yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Department Dialog */}
      <Dialog
        open={deptDialog.open}
        onOpenChange={(open) => {
          if (!open) setDeptDialog({ open: false, dept: null });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {deptDialog.dept ? "Edit Department" : "Add Department"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                className="mt-1"
                value={deptForm.name}
                onChange={(e) =>
                  setDeptForm({ ...deptForm, name: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                className="mt-1"
                value={deptForm.description}
                onChange={(e) =>
                  setDeptForm({ ...deptForm, description: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Offline Message</label>
              <Textarea
                className="mt-1"
                value={deptForm.offline_message}
                onChange={(e) =>
                  setDeptForm({ ...deptForm, offline_message: e.target.value })
                }
              />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <Switch
                  checked={deptForm.is_active}
                  onCheckedChange={(v) =>
                    setDeptForm({ ...deptForm, is_active: v })
                  }
                />
                <span className="text-sm">Active</span>
              </label>
              <label className="flex items-center gap-2">
                <Switch
                  checked={deptForm.auto_assign}
                  onCheckedChange={(v) =>
                    setDeptForm({ ...deptForm, auto_assign: v })
                  }
                />
                <span className="text-sm">Auto Assign</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeptDialog({ open: false, dept: null })}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveDepartment}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Canned Response Dialog */}
      <Dialog
        open={cannedDialog.open}
        onOpenChange={(open) => {
          if (!open) setCannedDialog({ open: false, response: null });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {cannedDialog.response ? "Edit Response" : "Add Response"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                className="mt-1"
                value={cannedForm.title}
                onChange={(e) =>
                  setCannedForm({ ...cannedForm, title: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Shortcut</label>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-muted-foreground">/</span>
                <Input
                  value={cannedForm.shortcut}
                  onChange={(e) =>
                    setCannedForm({
                      ...cannedForm,
                      shortcut: e.target.value.toLowerCase().replace(/\s/g, "_"),
                    })
                  }
                  placeholder="greeting"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Content</label>
              <Textarea
                className="mt-1"
                rows={4}
                value={cannedForm.content}
                onChange={(e) =>
                  setCannedForm({ ...cannedForm, content: e.target.value })
                }
              />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <Switch
                  checked={cannedForm.is_active}
                  onCheckedChange={(v) =>
                    setCannedForm({ ...cannedForm, is_active: v })
                  }
                />
                <span className="text-sm">Active</span>
              </label>
              <label className="flex items-center gap-2">
                <Switch
                  checked={cannedForm.is_global}
                  onCheckedChange={(v) =>
                    setCannedForm({ ...cannedForm, is_global: v })
                  }
                />
                <span className="text-sm">Global (all departments)</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCannedDialog({ open: false, response: null })}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveCannedResponse}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
