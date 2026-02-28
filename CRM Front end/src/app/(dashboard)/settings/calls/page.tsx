"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Phone,
  Settings,
  Mic,
  Clock,
  Bell,
  MousePointerClick,
  Save,
  Plus,
  Trash2,
  TestTube,
  Star,
  Edit,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  callSettingsApi,
  telephonyProviderApi,
  phoneLineApi,
  callQueueApi,
} from "@/lib/api/calls";
import type {
  CallSettings,
  TelephonyProvider,
  PhoneLine,
  CallQueue,
} from "@/types/calls";

export default function CallSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<CallSettings | null>(null);
  const [providers, setProviders] = useState<TelephonyProvider[]>([]);
  const [phoneLines, setPhoneLines] = useState<PhoneLine[]>([]);
  const [queues, setQueues] = useState<CallQueue[]>([]);
  const [providerDialogOpen, setProviderDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<TelephonyProvider | null>(null);
  const [lineDialogOpen, setLineDialogOpen] = useState(false);
  const [queueDialogOpen, setQueueDialogOpen] = useState(false);
  const [newLine, setNewLine] = useState<{ phone_number: string; friendly_name: string; line_type: "inbound" | "outbound" | "both" }>({ phone_number: "", friendly_name: "", line_type: "both" });
  const [newQueue, setNewQueue] = useState<{ name: string; strategy: "ring_all" | "round_robin" | "least_recent" | "random" | "linear"; max_wait_time: number }>({ name: "", strategy: "ring_all", max_wait_time: 300 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsData, providersData, linesData, queuesData] = await Promise.all([
        callSettingsApi.get(),
        telephonyProviderApi.list(),
        phoneLineApi.list(),
        callQueueApi.list(),
      ]);
      setSettings(settingsData);
      setProviders(providersData);
      setPhoneLines(linesData);
      setQueues(queuesData);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await callSettingsApi.update(settings);
    } catch {
      /* empty */
    } finally {
      setSaving(false);
    }
  };

  const handleTestProvider = async (id: string) => {
    try {
      const result = await telephonyProviderApi.testConnection(id);
      alert(result.message);
    } catch {
      alert("Connection test failed");
    }
  };

  const handleSetDefaultProvider = async (id: string) => {
    try {
      await telephonyProviderApi.setDefault(id);
      fetchData();
    } catch {
      /* empty */
    }
  };

  const handleDeleteProvider = async (id: string) => {
    if (!confirm("Are you sure you want to delete this provider?")) return;
    try {
      await telephonyProviderApi.delete(id);
      fetchData();
    } catch {
      /* empty */
    }
  };

  const handleCreateLine = async () => {
    try {
      await phoneLineApi.create(newLine);
      setLineDialogOpen(false);
      setNewLine({ phone_number: "", friendly_name: "", line_type: "both" });
      fetchData();
    } catch {
      alert("Failed to create phone line");
    }
  };

  const handleCreateQueue = async () => {
    try {
      await callQueueApi.create(newQueue);
      setQueueDialogOpen(false);
      setNewQueue({ name: "", strategy: "ring_all", max_wait_time: 300 });
      fetchData();
    } catch {
      alert("Failed to create call queue");
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Call Settings"
        actions={
          <Button onClick={handleSaveSettings} disabled={saving}>
            <Save className="mr-2 size-4" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        }
      />

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="lines">Phone Lines</TabsTrigger>
          <TabsTrigger value="queues">Call Queues</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 mt-6">
          {/* Recording Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="size-5" />
                Recording Settings
              </CardTitle>
              <CardDescription>
                Configure how calls are recorded and stored
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-record all calls</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically record all calls regardless of type
                  </p>
                </div>
                <Switch
                  checked={settings?.auto_record_all || false}
                  onCheckedChange={(checked) =>
                    setSettings((s) => s && { ...s, auto_record_all: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Record inbound calls</Label>
                  <p className="text-sm text-muted-foreground">
                    Record incoming calls
                  </p>
                </div>
                <Switch
                  checked={settings?.record_inbound || false}
                  onCheckedChange={(checked) =>
                    setSettings((s) => s && { ...s, record_inbound: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Record outbound calls</Label>
                  <p className="text-sm text-muted-foreground">
                    Record outgoing calls
                  </p>
                </div>
                <Switch
                  checked={settings?.record_outbound || false}
                  onCheckedChange={(checked) =>
                    setSettings((s) => s && { ...s, record_outbound: checked })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Recording format</Label>
                  <Select
                    value={settings?.recording_format || "mp3"}
                    onValueChange={(v) =>
                      setSettings((s) => s && { ...s, recording_format: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mp3">MP3</SelectItem>
                      <SelectItem value="wav">WAV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Retention (days)</Label>
                  <Input
                    type="number"
                    value={settings?.recording_retention_days || 365}
                    onChange={(e) =>
                      setSettings(
                        (s) =>
                          s && { ...s, recording_retention_days: parseInt(e.target.value) }
                      )
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transcription Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="size-5" />
                Transcription
              </CardTitle>
              <CardDescription>
                Automatically transcribe call recordings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable transcription</Label>
                  <p className="text-sm text-muted-foreground">
                    Convert call recordings to text
                  </p>
                </div>
                <Switch
                  checked={settings?.transcription_enabled || false}
                  onCheckedChange={(checked) =>
                    setSettings((s) => s && { ...s, transcription_enabled: checked })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Transcription language</Label>
                <Select
                  value={settings?.transcription_language || "en-US"}
                  onValueChange={(v) =>
                    setSettings((s) => s && { ...s, transcription_language: v })
                  }
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en-US">English (US)</SelectItem>
                    <SelectItem value="en-GB">English (UK)</SelectItem>
                    <SelectItem value="es-ES">Spanish</SelectItem>
                    <SelectItem value="fr-FR">French</SelectItem>
                    <SelectItem value="de-DE">German</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Call Handling */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="size-5" />
                Call Handling
              </CardTitle>
              <CardDescription>
                Configure how calls are handled
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Default ring timeout (seconds)</Label>
                <Input
                  type="number"
                  value={settings?.default_ring_timeout || 30}
                  onChange={(e) =>
                    setSettings(
                      (s) => s && { ...s, default_ring_timeout: parseInt(e.target.value) }
                    )
                  }
                  className="w-[120px]"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enforce business hours</Label>
                  <p className="text-sm text-muted-foreground">
                    Route calls differently outside business hours
                  </p>
                </div>
                <Switch
                  checked={settings?.enforce_business_hours || false}
                  onCheckedChange={(checked) =>
                    setSettings((s) => s && { ...s, enforce_business_hours: checked })
                  }
                />
              </div>
              {settings?.enforce_business_hours && (
                <>
                  <div className="space-y-2">
                    <Label>After hours action</Label>
                    <Select
                      value={settings?.after_hours_action || "voicemail"}
                      onValueChange={(v) =>
                        setSettings((s) => s && { ...s, after_hours_action: v })
                      }
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="voicemail">Go to voicemail</SelectItem>
                        <SelectItem value="message">Play message</SelectItem>
                        <SelectItem value="forward">Forward to number</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>After hours message</Label>
                    <Textarea
                      value={settings?.after_hours_message || ""}
                      onChange={(e) =>
                        setSettings((s) => s && { ...s, after_hours_message: e.target.value })
                      }
                      placeholder="Message to play or display after hours..."
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="size-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Missed call notification</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify users when they miss a call
                  </p>
                </div>
                <Switch
                  checked={settings?.missed_call_notification || false}
                  onCheckedChange={(checked) =>
                    setSettings((s) => s && { ...s, missed_call_notification: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Voicemail notification</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify users when they receive a voicemail
                  </p>
                </div>
                <Switch
                  checked={settings?.voicemail_notification || false}
                  onCheckedChange={(checked) =>
                    setSettings((s) => s && { ...s, voicemail_notification: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Click to Call */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MousePointerClick className="size-5" />
                Click to Call
              </CardTitle>
              <CardDescription>
                Enable one-click calling from within the CRM
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable click to call</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow users to call contacts by clicking phone numbers
                  </p>
                </div>
                <Switch
                  checked={settings?.click_to_call_enabled || false}
                  onCheckedChange={(checked) =>
                    setSettings((s) => s && { ...s, click_to_call_enabled: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Confirm before dialing</Label>
                  <p className="text-sm text-muted-foreground">
                    Show confirmation dialog before placing calls
                  </p>
                </div>
                <Switch
                  checked={settings?.confirm_before_dial || false}
                  onCheckedChange={(checked) =>
                    setSettings((s) => s && { ...s, confirm_before_dial: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="providers" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Telephony Providers</h3>
            <Dialog open={providerDialogOpen} onOpenChange={setProviderDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingProvider(null)}>
                  <Plus className="mr-2 size-4" />
                  Add Provider
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingProvider ? "Edit Provider" : "Add Provider"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Provider configuration form would go here
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {providers.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Caller ID</TableHead>
                    <TableHead className="w-32" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providers.map((provider) => (
                    <TableRow key={provider.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="size-4 text-muted-foreground" />
                          <span className="font-medium">{provider.name}</span>
                          {provider.is_default && (
                            <Badge variant="secondary">
                              <Star className="size-3 mr-1" />
                              Default
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{provider.provider_type_display}</TableCell>
                      <TableCell>
                        <Badge variant={provider.is_active ? "default" : "secondary"}>
                          {provider.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{provider.default_caller_id || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => handleTestProvider(provider.id)}
                          >
                            <TestTube className="size-4" />
                          </Button>
                          {!provider.is_default && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => handleSetDefaultProvider(provider.id)}
                            >
                              <Star className="size-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => {
                              setEditingProvider(provider);
                              setProviderDialogOpen(true);
                            }}
                          >
                            <Edit className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive"
                            onClick={() => handleDeleteProvider(provider.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground border rounded-lg">
              <Phone className="size-12 mx-auto mb-4 opacity-50" />
              <p>No telephony providers configured</p>
              <p className="text-sm">Add a provider to enable phone features</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="lines" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Phone Lines</h3>
            <Dialog open={lineDialogOpen} onOpenChange={setLineDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 size-4" />
                  Add Line
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Phone Line</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input
                      placeholder="+1 (555) 123-4567"
                      value={newLine.phone_number}
                      onChange={(e) => setNewLine({ ...newLine, phone_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Friendly Name</Label>
                    <Input
                      placeholder="Main Office Line"
                      value={newLine.friendly_name}
                      onChange={(e) => setNewLine({ ...newLine, friendly_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Line Type</Label>
                    <Select
                      value={newLine.line_type}
                      onValueChange={(v: "inbound" | "outbound" | "both") => setNewLine({ ...newLine, line_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">Both (Inbound & Outbound)</SelectItem>
                        <SelectItem value="inbound">Inbound Only</SelectItem>
                        <SelectItem value="outbound">Outbound Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setLineDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateLine}>
                      Create Line
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {phoneLines.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {phoneLines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className="font-medium">{line.phone_number}</TableCell>
                      <TableCell>{line.friendly_name || "—"}</TableCell>
                      <TableCell>{line.line_type_display}</TableCell>
                      <TableCell>
                        {line.assigned_user_name || line.assigned_department || "Unassigned"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={line.is_active ? "default" : "secondary"}>
                          {line.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="size-8">
                          <Edit className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground border rounded-lg">
              <Phone className="size-12 mx-auto mb-4 opacity-50" />
              <p>No phone lines configured</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="queues" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Call Queues</h3>
            <Dialog open={queueDialogOpen} onOpenChange={setQueueDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 size-4" />
                  Add Queue
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Call Queue</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Queue Name</Label>
                    <Input
                      placeholder="Sales Queue"
                      value={newQueue.name}
                      onChange={(e) => setNewQueue({ ...newQueue, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ring Strategy</Label>
                    <Select
                      value={newQueue.strategy}
                      onValueChange={(v: "ring_all" | "round_robin" | "least_recent" | "random" | "linear") => setNewQueue({ ...newQueue, strategy: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ring_all">Ring All</SelectItem>
                        <SelectItem value="round_robin">Round Robin</SelectItem>
                        <SelectItem value="least_recent">Least Recent</SelectItem>
                        <SelectItem value="random">Random</SelectItem>
                        <SelectItem value="linear">Linear</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Max Wait Time (seconds)</Label>
                    <Input
                      type="number"
                      value={newQueue.max_wait_time}
                      onChange={(e) => setNewQueue({ ...newQueue, max_wait_time: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setQueueDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateQueue}>
                      Create Queue
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {queues.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Strategy</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queues.map((queue) => (
                    <TableRow key={queue.id}>
                      <TableCell className="font-medium">{queue.name}</TableCell>
                      <TableCell>{queue.strategy_display}</TableCell>
                      <TableCell>{queue.member_count}</TableCell>
                      <TableCell>
                        {queue.active_members} / {queue.member_count}
                      </TableCell>
                      <TableCell>
                        <Badge variant={queue.is_active ? "default" : "secondary"}>
                          {queue.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="size-8">
                          <Edit className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground border rounded-lg">
              <Phone className="size-12 mx-auto mb-4 opacity-50" />
              <p>No call queues configured</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
