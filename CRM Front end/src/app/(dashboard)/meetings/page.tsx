"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Video,
  Plus,
  Search,
  Calendar,
  Clock,
  Users,
  ExternalLink,
  Play,
  Square,
  X,
  Copy,
  MoreVertical,
  CheckCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { videoMeetingApi } from "@/lib/api/video-meetings";
import type { VideoMeeting, MeetingStats } from "@/types/video-meetings";

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  started: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  ended: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  canceled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const providerColors: Record<string, string> = {
  zoom: "bg-blue-500",
  google_meet: "bg-green-500",
  teams: "bg-purple-500",
  webex: "bg-cyan-500",
  custom: "bg-gray-500",
};

export default function MeetingsPage() {
  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState<VideoMeeting[]>([]);
  const [upcoming, setUpcoming] = useState<VideoMeeting[]>([]);
  const [stats, setStats] = useState<MeetingStats | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newMeeting, setNewMeeting] = useState({
    title: "",
    description: "",
    scheduled_start: "",
    duration: 60,
    participant_emails: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== "all") params.status = statusFilter;

      const [meetingsData, upcomingData, statsData] = await Promise.all([
        videoMeetingApi.list(params),
        videoMeetingApi.upcoming(),
        videoMeetingApi.stats(),
      ]);

      const filtered = search
        ? meetingsData.filter(
            (m) =>
              m.title.toLowerCase().includes(search.toLowerCase()) ||
              m.meeting_number?.includes(search)
          )
        : meetingsData;

      setMeetings(filtered);
      setUpcoming(upcomingData);
      setStats(statsData);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateMeeting = async () => {
    try {
      const emails = newMeeting.participant_emails
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e);

      await videoMeetingApi.create({
        title: newMeeting.title,
        description: newMeeting.description,
        scheduled_start: new Date(newMeeting.scheduled_start).toISOString(),
        duration: newMeeting.duration,
        participant_emails: emails,
      });

      setCreateDialogOpen(false);
      setNewMeeting({
        title: "",
        description: "",
        scheduled_start: "",
        duration: 60,
        participant_emails: "",
      });
      fetchData();
    } catch {
      /* empty */
    }
  };

  const handleStartMeeting = async (id: string) => {
    try {
      await videoMeetingApi.start(id);
      fetchData();
    } catch {
      /* empty */
    }
  };

  const handleEndMeeting = async (id: string) => {
    try {
      await videoMeetingApi.end(id);
      fetchData();
    } catch {
      /* empty */
    }
  };

  const handleCancelMeeting = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this meeting?")) return;
    try {
      await videoMeetingApi.cancel(id);
      fetchData();
    } catch {
      /* empty */
    }
  };

  const copyJoinLink = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Video Meetings"
        actions={
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" />
                New Meeting
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule Meeting</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={newMeeting.title}
                    onChange={(e) =>
                      setNewMeeting({ ...newMeeting, title: e.target.value })
                    }
                    placeholder="Meeting title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newMeeting.description}
                    onChange={(e) =>
                      setNewMeeting({ ...newMeeting, description: e.target.value })
                    }
                    placeholder="Meeting description (optional)"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={newMeeting.scheduled_start}
                      onChange={(e) =>
                        setNewMeeting({
                          ...newMeeting,
                          scheduled_start: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (minutes)</Label>
                    <Select
                      value={newMeeting.duration.toString()}
                      onValueChange={(v) =>
                        setNewMeeting({ ...newMeeting, duration: parseInt(v) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 min</SelectItem>
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="45">45 min</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1.5 hours</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Participants (comma-separated emails)</Label>
                  <Textarea
                    value={newMeeting.participant_emails}
                    onChange={(e) =>
                      setNewMeeting({
                        ...newMeeting,
                        participant_emails: e.target.value,
                      })
                    }
                    placeholder="email1@example.com, email2@example.com"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateMeeting}>Schedule Meeting</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                <Video className="size-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.total_meetings}</div>
                <div className="text-sm text-muted-foreground">Total Meetings</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900">
                <Calendar className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.upcoming}</div>
                <div className="text-sm text-muted-foreground">Upcoming</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle className="size-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.completed_this_month}</div>
                <div className="text-sm text-muted-foreground">This Month</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
                <Users className="size-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.total_participants}</div>
                <div className="text-sm text-muted-foreground">Participants</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="all">All Meetings</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4 mt-4">
          {upcoming.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((meeting) => (
                <Card key={meeting.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{meeting.title}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <div
                            className={`size-2 rounded-full ${
                              providerColors[meeting.provider_type] || "bg-gray-500"
                            }`}
                          />
                          {meeting.provider_name}
                        </CardDescription>
                      </div>
                      <Badge className={statusColors[meeting.status] || ""}>
                        {meeting.status_display}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="size-4 text-muted-foreground" />
                      {format(new Date(meeting.scheduled_start), "PPP")}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="size-4 text-muted-foreground" />
                      {format(new Date(meeting.scheduled_start), "p")} -{" "}
                      {meeting.duration} min
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="size-4 text-muted-foreground" />
                      {meeting.participant_count || meeting.participants_count || 0}{" "}
                      participants
                    </div>
                    <div className="flex gap-2 pt-2">
                      {meeting.status === "scheduled" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() =>
                              window.open(meeting.host_url || meeting.join_url, "_blank")
                            }
                          >
                            <Play className="mr-1 size-3" />
                            Start
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyJoinLink(meeting.join_url)}
                          >
                            <Copy className="mr-1 size-3" />
                            Copy Link
                          </Button>
                        </>
                      )}
                      {meeting.status === "started" && (
                        <Button size="sm" onClick={() => handleEndMeeting(meeting.id)}>
                          <Square className="mr-1 size-3" />
                          End
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Video className="size-12 text-muted-foreground mb-4" />
                <CardTitle className="mb-2">No Upcoming Meetings</CardTitle>
                <CardDescription className="mb-4">
                  Schedule a meeting to get started
                </CardDescription>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 size-4" />
                  Schedule Meeting
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search meetings..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="started">In Progress</SelectItem>
                <SelectItem value="ended">Ended</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : meetings.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Meeting</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Participants</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meetings.map((meeting) => (
                    <TableRow key={meeting.id}>
                      <TableCell>
                        <div className="font-medium">{meeting.title}</div>
                        {meeting.meeting_number && (
                          <div className="text-sm text-muted-foreground">
                            ID: {meeting.meeting_number}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className={`size-2 rounded-full ${
                              providerColors[meeting.provider_type] || "bg-gray-500"
                            }`}
                          />
                          {meeting.provider_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(meeting.scheduled_start), "PPp")}
                      </TableCell>
                      <TableCell>{meeting.duration} min</TableCell>
                      <TableCell>
                        {meeting.participant_count || meeting.participants_count || 0}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[meeting.status] || ""}>
                          {meeting.status_display}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {meeting.status === "scheduled" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    window.open(
                                      meeting.host_url || meeting.join_url,
                                      "_blank"
                                    )
                                  }
                                >
                                  <Play className="mr-2 size-4" />
                                  Start Meeting
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => copyJoinLink(meeting.join_url)}
                                >
                                  <Copy className="mr-2 size-4" />
                                  Copy Join Link
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleCancelMeeting(meeting.id)}
                                >
                                  <X className="mr-2 size-4" />
                                  Cancel
                                </DropdownMenuItem>
                              </>
                            )}
                            {meeting.status === "started" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    window.open(meeting.join_url, "_blank")
                                  }
                                >
                                  <ExternalLink className="mr-2 size-4" />
                                  Join Meeting
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleEndMeeting(meeting.id)}
                                >
                                  <Square className="mr-2 size-4" />
                                  End Meeting
                                </DropdownMenuItem>
                              </>
                            )}
                            {meeting.status === "ended" && meeting.recording_url && (
                              <DropdownMenuItem
                                onClick={() =>
                                  window.open(meeting.recording_url, "_blank")
                                }
                              >
                                <Video className="mr-2 size-4" />
                                View Recording
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No meetings found.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
