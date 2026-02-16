"use client";

import { useCallback, useEffect, useState } from "react";
import { format, formatDuration, intervalToDuration } from "date-fns";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  PhoneOff,
  Clock,
  Search,
  Play,
  FileText,
  User,
  Building,
  Briefcase,
  ChevronDown,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { callApi } from "@/lib/api/calls";
import type { Call, CallStats } from "@/types/calls";

function formatCallDuration(seconds: number): string {
  if (seconds === 0) return "0s";
  const duration = intervalToDuration({ start: 0, end: seconds * 1000 });
  return formatDuration(duration, { format: ["hours", "minutes", "seconds"], zero: false });
}

const statusColors: Record<string, string> = {
  initiated: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  ringing: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  in_progress: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  completed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  busy: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  no_answer: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  canceled: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  voicemail: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
};

export default function CallsPage() {
  const [loading, setLoading] = useState(true);
  const [calls, setCalls] = useState<Call[]>([]);
  const [stats, setStats] = useState<CallStats | null>(null);
  const [search, setSearch] = useState("");
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [period, setPeriod] = useState<"today" | "week" | "month">("today");
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [outcome, setOutcome] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (directionFilter !== "all") params.direction = directionFilter;
      if (statusFilter !== "all") params.status = statusFilter;

      const [callsData, statsData] = await Promise.all([
        callApi.list(params),
        callApi.stats(period),
      ]);

      const filtered = search
        ? callsData.filter(
            (c) =>
              c.from_number.includes(search) ||
              c.to_number.includes(search) ||
              c.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
              c.subject?.toLowerCase().includes(search.toLowerCase())
          )
        : callsData;

      setCalls(filtered);
      setStats(statsData);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, [directionFilter, statusFilter, search, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogNotes = async () => {
    if (!selectedCall) return;
    try {
      await callApi.logNotes(selectedCall.id, { notes, outcome });
      setNotesDialogOpen(false);
      setNotes("");
      setOutcome("");
      fetchData();
    } catch {
      /* empty */
    }
  };

  const openNotesDialog = (call: Call) => {
    setSelectedCall(call);
    setNotes(call.notes || "");
    setOutcome(call.outcome || "");
    setNotesDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Call Log" />

      {/* Stats Cards */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={period === "today" ? "default" : "outline"}
          size="sm"
          onClick={() => setPeriod("today")}
        >
          Today
        </Button>
        <Button
          variant={period === "week" ? "default" : "outline"}
          size="sm"
          onClick={() => setPeriod("week")}
        >
          This Week
        </Button>
        <Button
          variant={period === "month" ? "default" : "outline"}
          size="sm"
          onClick={() => setPeriod("month")}
        >
          This Month
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="border rounded-lg p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
              <Phone className="size-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.total_calls}</div>
              <div className="text-sm text-muted-foreground">Total Calls</div>
            </div>
          </div>
          <div className="border rounded-lg p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
              <PhoneIncoming className="size-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.inbound_calls}</div>
              <div className="text-sm text-muted-foreground">Inbound</div>
            </div>
          </div>
          <div className="border rounded-lg p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900">
              <PhoneOutgoing className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.outbound_calls}</div>
              <div className="text-sm text-muted-foreground">Outbound</div>
            </div>
          </div>
          <div className="border rounded-lg p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-red-100 dark:bg-red-900">
              <PhoneMissed className="size-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.missed_calls}</div>
              <div className="text-sm text-muted-foreground">Missed</div>
            </div>
          </div>
        </div>
      )}

      {/* Additional Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="size-4" />
              <span className="text-sm">Total Talk Time</span>
            </div>
            <div className="text-xl font-semibold">
              {formatCallDuration(stats.total_duration)}
            </div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="size-4" />
              <span className="text-sm">Avg. Call Duration</span>
            </div>
            <div className="text-xl font-semibold">
              {formatCallDuration(Math.round(stats.avg_duration))}
            </div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Phone className="size-4" />
              <span className="text-sm">Answered Rate</span>
            </div>
            <div className="text-xl font-semibold">
              {stats.total_calls > 0
                ? Math.round((stats.answered_calls / stats.total_calls) * 100)
                : 0}
              %
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search calls..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={directionFilter} onValueChange={setDirectionFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Direction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Directions</SelectItem>
            <SelectItem value="inbound">Inbound</SelectItem>
            <SelectItem value="outbound">Outbound</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="no_answer">No Answer</SelectItem>
            <SelectItem value="busy">Busy</SelectItem>
            <SelectItem value="voicemail">Voicemail</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Call List */}
      {loading ? (
        <LoadingSpinner />
      ) : calls.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Direction</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.map((call) => (
                <TableRow key={call.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {call.direction === "inbound" ? (
                        <PhoneIncoming className="size-4 text-green-500" />
                      ) : (
                        <PhoneOutgoing className="size-4 text-amber-500" />
                      )}
                      <span className="capitalize">{call.direction}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {call.direction === "inbound" ? call.from_number : call.to_number}
                    </div>
                  </TableCell>
                  <TableCell>
                    {call.contact_name ? (
                      <div className="flex items-center gap-2">
                        <User className="size-4 text-muted-foreground" />
                        <span>{call.contact_name}</span>
                      </div>
                    ) : call.corporation_name ? (
                      <div className="flex items-center gap-2">
                        <Building className="size-4 text-muted-foreground" />
                        <span>{call.corporation_name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Unknown</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[call.status] || ""}>
                      {call.status_display}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatCallDuration(call.duration)}</TableCell>
                  <TableCell>{call.user_name || "—"}</TableCell>
                  <TableCell>
                    {call.started_at
                      ? format(new Date(call.started_at), "MMM d, yyyy HH:mm")
                      : format(new Date(call.created_at), "MMM d, yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <ChevronDown className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedCall(call)}>
                          <Phone className="mr-2 size-4" />
                          View Details
                        </DropdownMenuItem>
                        {call.is_recorded && call.recording_url && (
                          <DropdownMenuItem
                            onClick={() => window.open(call.recording_url, "_blank")}
                          >
                            <Play className="mr-2 size-4" />
                            Play Recording
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => openNotesDialog(call)}>
                          <FileText className="mr-2 size-4" />
                          Log Notes
                        </DropdownMenuItem>
                        {call.case_number && (
                          <DropdownMenuItem>
                            <Briefcase className="mr-2 size-4" />
                            View Case
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
          No calls found matching your criteria.
        </div>
      )}

      {/* Call Details Dialog */}
      <Dialog open={!!selectedCall && !notesDialogOpen} onOpenChange={(open) => !open && setSelectedCall(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Call Details</DialogTitle>
          </DialogHeader>
          {selectedCall && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Direction</div>
                  <div className="flex items-center gap-2">
                    {selectedCall.direction === "inbound" ? (
                      <PhoneIncoming className="size-4 text-green-500" />
                    ) : (
                      <PhoneOutgoing className="size-4 text-amber-500" />
                    )}
                    {selectedCall.direction_display}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Status</div>
                  <Badge className={statusColors[selectedCall.status] || ""}>
                    {selectedCall.status_display}
                  </Badge>
                </div>
                <div>
                  <div className="text-muted-foreground">From</div>
                  <div>{selectedCall.from_number}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">To</div>
                  <div>{selectedCall.to_number}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Duration</div>
                  <div>{formatCallDuration(selectedCall.duration)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Ring Time</div>
                  <div>{formatCallDuration(selectedCall.ring_duration)}</div>
                </div>
                {selectedCall.contact_name && (
                  <div>
                    <div className="text-muted-foreground">Contact</div>
                    <div>{selectedCall.contact_name}</div>
                  </div>
                )}
                {selectedCall.user_name && (
                  <div>
                    <div className="text-muted-foreground">Agent</div>
                    <div>{selectedCall.user_name}</div>
                  </div>
                )}
              </div>
              {selectedCall.subject && (
                <div>
                  <div className="text-muted-foreground text-sm">Subject</div>
                  <div>{selectedCall.subject}</div>
                </div>
              )}
              {selectedCall.notes && (
                <div>
                  <div className="text-muted-foreground text-sm">Notes</div>
                  <div className="p-3 bg-muted rounded-lg whitespace-pre-wrap">
                    {selectedCall.notes}
                  </div>
                </div>
              )}
              {selectedCall.outcome && (
                <div>
                  <div className="text-muted-foreground text-sm">Outcome</div>
                  <div>{selectedCall.outcome}</div>
                </div>
              )}
              {selectedCall.is_recorded && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    <Play className="mr-1 size-3" />
                    Recorded
                  </Badge>
                  {selectedCall.recording_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(selectedCall.recording_url, "_blank")}
                    >
                      Play Recording
                    </Button>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => openNotesDialog(selectedCall)}>
                  <FileText className="mr-2 size-4" />
                  Log Notes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Log Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Call Notes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter call notes..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Outcome</Label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger>
                  <SelectValue placeholder="Select outcome" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="successful">Successful</SelectItem>
                  <SelectItem value="callback_requested">Callback Requested</SelectItem>
                  <SelectItem value="not_interested">Not Interested</SelectItem>
                  <SelectItem value="left_voicemail">Left Voicemail</SelectItem>
                  <SelectItem value="wrong_number">Wrong Number</SelectItem>
                  <SelectItem value="no_answer">No Answer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNotesDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleLogNotes}>Save Notes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
