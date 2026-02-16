"use client";

import { useCallback, useEffect, useState } from "react";
import { format, formatDuration, intervalToDuration } from "date-fns";
import {
  Voicemail as VoicemailIcon,
  Play,
  Pause,
  Archive,
  Check,
  Phone,
  User,
  Search,
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
import { voicemailApi } from "@/lib/api/calls";
import type { Voicemail } from "@/types/calls";

function formatVoicemailDuration(seconds: number): string {
  if (seconds === 0) return "0:00";
  const duration = intervalToDuration({ start: 0, end: seconds * 1000 });
  const mins = duration.minutes || 0;
  const secs = duration.seconds || 0;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  listened: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  archived: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
};

export default function VoicemailsPage() {
  const [loading, setLoading] = useState(true);
  const [voicemails, setVoicemails] = useState<Voicemail[]>([]);
  const [newCount, setNewCount] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedVoicemail, setSelectedVoicemail] = useState<Voicemail | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== "all") params.status = statusFilter;

      const [voicemailsData, countData] = await Promise.all([
        voicemailApi.list(params),
        voicemailApi.newCount(),
      ]);

      const filtered = search
        ? voicemailsData.filter(
            (v) =>
              v.caller_number.includes(search) ||
              v.caller_name?.toLowerCase().includes(search.toLowerCase()) ||
              v.transcription?.toLowerCase().includes(search.toLowerCase())
          )
        : voicemailsData;

      setVoicemails(filtered);
      setNewCount(countData.count);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMarkListened = async (id: string) => {
    try {
      await voicemailApi.markListened(id);
      fetchData();
    } catch {
      /* empty */
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await voicemailApi.archive(id);
      fetchData();
    } catch {
      /* empty */
    }
  };

  const togglePlay = (voicemail: Voicemail) => {
    if (playing === voicemail.id) {
      setPlaying(null);
    } else {
      setPlaying(voicemail.id);
      // Mark as listened when played
      if (voicemail.status === "new") {
        handleMarkListened(voicemail.id);
      }
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Voicemails"
        actions={
          newCount > 0 && (
            <Badge variant="default">
              {newCount} new
            </Badge>
          )
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="border rounded-lg p-4 flex items-center gap-4">
          <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
            <VoicemailIcon className="size-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="text-2xl font-bold">{voicemails.length}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </div>
        </div>
        <div className="border rounded-lg p-4 flex items-center gap-4">
          <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900">
            <VoicemailIcon className="size-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-bold">{newCount}</div>
            <div className="text-sm text-muted-foreground">New</div>
          </div>
        </div>
        <div className="border rounded-lg p-4 flex items-center gap-4">
          <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
            <Check className="size-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <div className="text-2xl font-bold">
              {voicemails.filter((v) => v.status === "listened").length}
            </div>
            <div className="text-sm text-muted-foreground">Listened</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search voicemails..."
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
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="listened">Listened</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Voicemail List */}
      {loading ? (
        <LoadingSpinner />
      ) : voicemails.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12" />
                <TableHead>From</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {voicemails.map((vm) => (
                <TableRow
                  key={vm.id}
                  className={vm.status === "new" ? "bg-blue-50 dark:bg-blue-950/20" : ""}
                >
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => togglePlay(vm)}
                    >
                      {playing === vm.id ? (
                        <Pause className="size-4" />
                      ) : (
                        <Play className="size-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{vm.caller_number}</div>
                    {vm.caller_name && (
                      <div className="text-sm text-muted-foreground">{vm.caller_name}</div>
                    )}
                    {vm.contact_name && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <User className="size-3" />
                        {vm.contact_name}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{formatVoicemailDuration(vm.duration)}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[vm.status] || ""}>
                      {vm.status_display}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(vm.created_at), "MMM d, yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => setSelectedVoicemail(vm)}
                      >
                        <VoicemailIcon className="size-4" />
                      </Button>
                      {vm.status !== "listened" && vm.status !== "archived" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => handleMarkListened(vm.id)}
                        >
                          <Check className="size-4" />
                        </Button>
                      )}
                      {vm.status !== "archived" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => handleArchive(vm.id)}
                        >
                          <Archive className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          No voicemails found.
        </div>
      )}

      {/* Voicemail Detail Dialog */}
      <Dialog
        open={!!selectedVoicemail}
        onOpenChange={(open) => !open && setSelectedVoicemail(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Voicemail from {selectedVoicemail?.caller_number}</DialogTitle>
          </DialogHeader>
          {selectedVoicemail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">From</div>
                  <div>{selectedVoicemail.caller_number}</div>
                </div>
                {selectedVoicemail.caller_name && (
                  <div>
                    <div className="text-muted-foreground">Name</div>
                    <div>{selectedVoicemail.caller_name}</div>
                  </div>
                )}
                <div>
                  <div className="text-muted-foreground">Duration</div>
                  <div>{formatVoicemailDuration(selectedVoicemail.duration)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Received</div>
                  <div>
                    {format(new Date(selectedVoicemail.created_at), "MMM d, yyyy HH:mm")}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Status</div>
                  <Badge className={statusColors[selectedVoicemail.status] || ""}>
                    {selectedVoicemail.status_display}
                  </Badge>
                </div>
                <div>
                  <div className="text-muted-foreground">Phone Line</div>
                  <div>{selectedVoicemail.phone_line_number}</div>
                </div>
              </div>

              {selectedVoicemail.audio_url && (
                <div>
                  <div className="text-muted-foreground text-sm mb-2">Audio</div>
                  <audio
                    controls
                    className="w-full"
                    src={selectedVoicemail.audio_url}
                    onPlay={() => {
                      if (selectedVoicemail.status === "new") {
                        handleMarkListened(selectedVoicemail.id);
                      }
                    }}
                  />
                </div>
              )}

              {selectedVoicemail.transcription && (
                <div>
                  <div className="text-muted-foreground text-sm mb-2">Transcription</div>
                  <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap">
                    {selectedVoicemail.transcription}
                  </div>
                </div>
              )}

              {selectedVoicemail.contact_name && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <User className="size-4" />
                  <span>Linked to contact: {selectedVoicemail.contact_name}</span>
                </div>
              )}

              <div className="flex gap-2">
                {selectedVoicemail.status !== "archived" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleArchive(selectedVoicemail.id);
                      setSelectedVoicemail(null);
                    }}
                  >
                    <Archive className="mr-2 size-4" />
                    Archive
                  </Button>
                )}
                <Button variant="outline">
                  <Phone className="mr-2 size-4" />
                  Call Back
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
