"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Search,
  Mail,
  Phone,
  CheckCircle,
  MessageSquare,
  UserPlus,
  ChevronDown,
  ExternalLink,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { offlineMessageApi, chatDepartmentApi } from "@/lib/api/live-chat";
import type { OfflineMessage, ChatDepartment } from "@/types/live-chat";

export default function OfflineMessagesPage() {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<OfflineMessage[]>([]);
  const [departments, setDepartments] = useState<ChatDepartment[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "unresponded">("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [selectedMessage, setSelectedMessage] = useState<OfflineMessage | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, boolean | string> = {};
      if (filter === "unread") params.is_read = false;
      if (filter === "unresponded") params.is_responded = false;
      if (departmentFilter !== "all") params.department = departmentFilter;

      const [messagesData, deptsData] = await Promise.all([
        offlineMessageApi.list(params),
        chatDepartmentApi.list(),
      ]);

      const filtered = search
        ? messagesData.filter(
            (m) =>
              m.name.toLowerCase().includes(search.toLowerCase()) ||
              m.email.toLowerCase().includes(search.toLowerCase()) ||
              m.message.toLowerCase().includes(search.toLowerCase())
          )
        : messagesData;

      setMessages(filtered);
      setDepartments(deptsData);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, [filter, departmentFilter, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMarkRead = async (id: string) => {
    try {
      await offlineMessageApi.markRead(id);
      fetchData();
    } catch {
      /* empty */
    }
  };

  const handleMarkResponded = async (id: string) => {
    try {
      await offlineMessageApi.markResponded(id);
      fetchData();
    } catch {
      /* empty */
    }
  };

  const handleConvertToContact = async (id: string) => {
    try {
      await offlineMessageApi.convertToContact(id);
      fetchData();
    } catch {
      /* empty */
    }
  };

  const unreadCount = messages.filter((m) => !m.is_read).length;
  const unrespondedCount = messages.filter((m) => !m.is_responded).length;

  return (
    <div className="space-y-4">
      <PageHeader title="Offline Messages" />

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="border rounded-lg p-4 flex items-center gap-4">
          <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
            <MessageSquare className="size-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="text-2xl font-bold">{messages.length}</div>
            <div className="text-sm text-muted-foreground">Total Messages</div>
          </div>
        </div>
        <div className="border rounded-lg p-4 flex items-center gap-4">
          <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900">
            <Mail className="size-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-bold">{unreadCount}</div>
            <div className="text-sm text-muted-foreground">Unread</div>
          </div>
        </div>
        <div className="border rounded-lg p-4 flex items-center gap-4">
          <div className="p-3 rounded-full bg-rose-100 dark:bg-rose-900">
            <CheckCircle className="size-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <div className="text-2xl font-bold">{unrespondedCount}</div>
            <div className="text-sm text-muted-foreground">Need Response</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search messages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="unresponded">Need Response</SelectItem>
          </SelectContent>
        </Select>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : messages.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Received</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.map((msg) => (
                <TableRow
                  key={msg.id}
                  className={!msg.is_read ? "bg-blue-50 dark:bg-blue-950/20" : ""}
                >
                  <TableCell>
                    <div className="font-medium">{msg.name}</div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="size-3" />
                      {msg.email}
                    </div>
                    {msg.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="size-3" />
                        {msg.phone}
                      </div>
                    )}
                  </TableCell>
                  <TableCell
                    className="max-w-md cursor-pointer"
                    onClick={() => setSelectedMessage(msg)}
                  >
                    <p className="truncate">{msg.message}</p>
                  </TableCell>
                  <TableCell>
                    {msg.department_name || (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge
                        variant={msg.is_read ? "outline" : "default"}
                        className="w-fit"
                      >
                        {msg.is_read ? "Read" : "Unread"}
                      </Badge>
                      <Badge
                        variant={msg.is_responded ? "outline" : "secondary"}
                        className="w-fit"
                      >
                        {msg.is_responded ? "Responded" : "Pending"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(msg.created_at), "MMM d, yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <ChevronDown className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedMessage(msg)}>
                          <ExternalLink className="mr-2 size-4" />
                          View Details
                        </DropdownMenuItem>
                        {!msg.is_read && (
                          <DropdownMenuItem onClick={() => handleMarkRead(msg.id)}>
                            <CheckCircle className="mr-2 size-4" />
                            Mark as Read
                          </DropdownMenuItem>
                        )}
                        {!msg.is_responded && (
                          <DropdownMenuItem
                            onClick={() => handleMarkResponded(msg.id)}
                          >
                            <CheckCircle className="mr-2 size-4" />
                            Mark as Responded
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {!msg.converted_to_contact && (
                          <DropdownMenuItem
                            onClick={() => handleConvertToContact(msg.id)}
                          >
                            <UserPlus className="mr-2 size-4" />
                            Create Contact
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
          No offline messages found.
        </div>
      )}

      {/* Message Detail Dialog */}
      <Dialog
        open={!!selectedMessage}
        onOpenChange={(open) => {
          if (!open) setSelectedMessage(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Message from {selectedMessage?.name}</DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Email</div>
                  <div>{selectedMessage.email}</div>
                </div>
                {selectedMessage.phone && (
                  <div>
                    <div className="text-muted-foreground">Phone</div>
                    <div>{selectedMessage.phone}</div>
                  </div>
                )}
                <div>
                  <div className="text-muted-foreground">Department</div>
                  <div>{selectedMessage.department_name || "Not specified"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Received</div>
                  <div>
                    {format(
                      new Date(selectedMessage.created_at),
                      "MMM d, yyyy HH:mm"
                    )}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-sm mb-2">Message</div>
                <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap">
                  {selectedMessage.message}
                </div>
              </div>
              {selectedMessage.page_url && (
                <div className="text-sm">
                  <div className="text-muted-foreground">Page URL</div>
                  <a
                    href={selectedMessage.page_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {selectedMessage.page_url}
                  </a>
                </div>
              )}
              <div className="flex gap-2">
                {!selectedMessage.is_read && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleMarkRead(selectedMessage.id);
                      setSelectedMessage({ ...selectedMessage, is_read: true });
                    }}
                  >
                    Mark as Read
                  </Button>
                )}
                {!selectedMessage.is_responded && (
                  <Button
                    onClick={() => {
                      handleMarkResponded(selectedMessage.id);
                      setSelectedMessage({
                        ...selectedMessage,
                        is_responded: true,
                      });
                    }}
                  >
                    Mark as Responded
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
