"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Save,
  Plus,
  Trash2,
  Video,
  Link2,
  Check,
  X,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  videoProviderApi,
  videoConnectionApi,
  videoMeetingSettingsApi,
} from "@/lib/api/video-meetings";
import type {
  VideoProvider,
  UserVideoConnection,
  VideoMeetingSettings,
} from "@/types/video-meetings";

const settingsSchema = z.object({
  default_provider: z.string().optional(),
  default_duration: z.number().min(5).max(480),
  default_waiting_room: z.boolean(),
  default_mute_on_entry: z.boolean(),
  default_auto_recording: z.enum(["none", "local", "cloud"]),
  auto_add_to_appointments: z.boolean(),
  send_calendar_invites: z.boolean(),
  send_reminder_emails: z.boolean(),
  reminder_minutes_before: z.number().min(0).max(1440),
});

type SettingsValues = z.infer<typeof settingsSchema>;

export default function VideoMeetingSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [providers, setProviders] = useState<VideoProvider[]>([]);
  const [connections, setConnections] = useState<UserVideoConnection[]>([]);
  const [providerDialog, setProviderDialog] = useState(false);
  const [newProvider, setNewProvider] = useState<{
    name: string;
    provider_type: "zoom" | "google_meet" | "teams" | "webex" | "custom";
    client_id: string;
    client_secret: string;
  }>({
    name: "",
    provider_type: "zoom",
    client_id: "",
    client_secret: "",
  });

  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      default_provider: "",
      default_duration: 60,
      default_waiting_room: true,
      default_mute_on_entry: false,
      default_auto_recording: "none",
      auto_add_to_appointments: true,
      send_calendar_invites: true,
      send_reminder_emails: true,
      reminder_minutes_before: 30,
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [providersData, connectionsData, settingsData] = await Promise.all([
          videoProviderApi.list(),
          videoConnectionApi.list(),
          videoMeetingSettingsApi.get(),
        ]);

        setProviders(providersData);
        setConnections(connectionsData);
        form.reset({
          default_provider: settingsData.default_provider || "",
          default_duration: settingsData.default_duration,
          default_waiting_room: settingsData.default_waiting_room,
          default_mute_on_entry: settingsData.default_mute_on_entry,
          default_auto_recording: settingsData.default_auto_recording,
          auto_add_to_appointments: settingsData.auto_add_to_appointments,
          send_calendar_invites: settingsData.send_calendar_invites,
          send_reminder_emails: settingsData.send_reminder_emails,
          reminder_minutes_before: settingsData.reminder_minutes_before,
        });
      } catch {
        // API might not exist yet, use defaults
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [form]);

  const onSubmit = async (data: SettingsValues) => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await videoMeetingSettingsApi.update(data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await videoProviderApi.setDefault(id);
      setProviders((prev) =>
        prev.map((p) => ({ ...p, is_default: p.id === id }))
      );
    } catch {
      setError("Failed to set default provider");
    }
  };

  const handleDisconnect = async (id: string) => {
    try {
      await videoConnectionApi.disconnect(id);
      setConnections((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setError("Failed to disconnect");
    }
  };

  const handleRefreshToken = async (id: string) => {
    try {
      await videoConnectionApi.refreshToken(id);
      // Refresh connections list
      const connectionsData = await videoConnectionApi.list();
      setConnections(connectionsData);
    } catch {
      setError("Failed to refresh token");
    }
  };

  const handleConnect = async (providerId: string) => {
    try {
      const { oauth_url } = await videoProviderApi.getOAuthUrl(providerId);
      window.open(oauth_url, "_blank");
    } catch {
      setError("Failed to get connection URL");
    }
  };

  const getProviderIcon = (type: string) => {
    // Return appropriate icon based on provider type
    return <Video className="size-5" />;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Video Meeting Settings</h1>
        <p className="text-muted-foreground">
          Configure video conferencing providers and meeting defaults
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500 bg-green-50 text-green-700">
          <AlertDescription>Settings saved successfully!</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">General Settings</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="connections">My Connections</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Meeting Defaults</CardTitle>
              <CardDescription>
                Configure default settings for new video meetings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="default_provider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Provider</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select provider" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {providers.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="default_duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Duration (minutes)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseInt(e.target.value) || 60)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="reminder_minutes_before"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reminder Minutes Before</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseInt(e.target.value) || 30)
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            Send reminder notification minutes before meeting
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="default_auto_recording"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div>
                            <FormLabel>Auto-Recording</FormLabel>
                            <FormDescription>
                              Default recording setting for meetings
                            </FormDescription>
                          </div>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="local">Local</SelectItem>
                              <SelectItem value="cloud">Cloud</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="default_waiting_room"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div>
                            <FormLabel>Enable Waiting Room</FormLabel>
                            <FormDescription>
                              Hold participants in waiting room until admitted
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

                    <FormField
                      control={form.control}
                      name="default_mute_on_entry"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div>
                            <FormLabel>Mute on Entry</FormLabel>
                            <FormDescription>
                              Mute participants when they join
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

                    <FormField
                      control={form.control}
                      name="auto_add_to_appointments"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div>
                            <FormLabel>Auto-add to Appointments</FormLabel>
                            <FormDescription>
                              Automatically add video links to appointments
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

                    <FormField
                      control={form.control}
                      name="send_calendar_invites"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div>
                            <FormLabel>Send Calendar Invites</FormLabel>
                            <FormDescription>
                              Automatically send calendar invitations
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

                    <FormField
                      control={form.control}
                      name="send_reminder_emails"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div>
                            <FormLabel>Send Reminder Emails</FormLabel>
                            <FormDescription>
                              Send email reminders before meetings
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
                  </div>

                  <Button type="submit" disabled={saving}>
                    <Save className="mr-2 size-4" />
                    {saving ? "Saving..." : "Save Settings"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="providers" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Video Providers</CardTitle>
                <CardDescription>
                  Configure video conferencing providers (Admin only)
                </CardDescription>
              </div>
              <Button onClick={() => setProviderDialog(true)}>
                <Plus className="mr-2 size-4" />
                Add Provider
              </Button>
            </CardHeader>
            <CardContent>
              {providers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Default</TableHead>
                      <TableHead className="w-32" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {providers.map((provider) => (
                      <TableRow key={provider.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getProviderIcon(provider.provider_type)}
                            {provider.name}
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">
                          {provider.provider_type}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={provider.is_active ? "default" : "secondary"}
                            className={
                              provider.is_active
                                ? "bg-green-100 text-green-700"
                                : ""
                            }
                          >
                            {provider.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {provider.is_default ? (
                            <Check className="size-4 text-green-500" />
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetDefault(provider.id)}
                            >
                              Set Default
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConnect(provider.id)}
                          >
                            <Link2 className="mr-2 size-4" />
                            Connect
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Video className="mx-auto size-12 mb-4 opacity-50" />
                  No video providers configured yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Connections</CardTitle>
              <CardDescription>
                Manage your connected video conferencing accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {connections.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-40" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {connections.map((connection) => (
                      <TableRow key={connection.id}>
                        <TableCell>{connection.provider_email}</TableCell>
                        <TableCell>
                          {providers.find((p) => p.id === connection.provider)?.name ||
                            "Unknown"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={connection.is_active ? "default" : "secondary"}
                            className={
                              connection.is_active
                                ? "bg-green-100 text-green-700"
                                : ""
                            }
                          >
                            {connection.is_active ? "Connected" : "Disconnected"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRefreshToken(connection.id)}
                            >
                              <RefreshCw className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => handleDisconnect(connection.id)}
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
                  <Link2 className="mx-auto size-12 mb-4 opacity-50" />
                  No video accounts connected. Connect a provider above.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={providerDialog} onOpenChange={setProviderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Video Provider</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newProvider.name}
                onChange={(e) =>
                  setNewProvider((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="e.g., Company Zoom"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Provider Type</label>
              <Select
                value={newProvider.provider_type}
                onValueChange={(v) =>
                  setNewProvider((p) => ({ ...p, provider_type: v as typeof p.provider_type }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zoom">Zoom</SelectItem>
                  <SelectItem value="google_meet">Google Meet</SelectItem>
                  <SelectItem value="teams">Microsoft Teams</SelectItem>
                  <SelectItem value="webex">Webex</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Client ID</label>
              <Input
                value={newProvider.client_id}
                onChange={(e) =>
                  setNewProvider((p) => ({ ...p, client_id: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Client Secret</label>
              <Input
                type="password"
                value={newProvider.client_secret}
                onChange={(e) =>
                  setNewProvider((p) => ({ ...p, client_secret: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProviderDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  await videoProviderApi.create(newProvider);
                  const providersData = await videoProviderApi.list();
                  setProviders(providersData);
                  setProviderDialog(false);
                  setNewProvider({
                    name: "",
                    provider_type: "zoom",
                    client_id: "",
                    client_secret: "",
                  });
                } catch {
                  setError("Failed to create provider");
                }
              }}
            >
              Add Provider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
