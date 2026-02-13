"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  AtSign,
  RefreshCw,
  Activity,
  Settings,
  MessageCircle,
  Search,
  Mail,
  Phone,
  Users as UsersIcon,
  MessageSquare,
  ListTodo,
  Plus,
  ChevronDown,
  Clock,
  Calendar,
  AlertCircle,
  ListPlus,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getNotifications } from "@/lib/api/notifications";
import { getAppointments } from "@/lib/api/appointments";
import { getTasks } from "@/lib/api/tasks";
import { getContacts } from "@/lib/api/contacts";
import type { Notification } from "@/types/notifications";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TodayEvent {
  id: string;
  title: string;
  start: string;
  status: string;
}

interface TodayTask {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
}

type Tab = "mentions" | "updates" | "engagements";

/* ------------------------------------------------------------------ */
/*  Left Panel Tabs                                                    */
/* ------------------------------------------------------------------ */

const TABS: { key: Tab; label: string; icon: typeof AtSign }[] = [
  { key: "mentions", label: "@Mentions", icon: AtSign },
  { key: "updates", label: "Updates", icon: RefreshCw },
  { key: "engagements", label: "Engagements", icon: Activity },
];

/* ------------------------------------------------------------------ */
/*  New Action Dropdown Items                                          */
/* ------------------------------------------------------------------ */

const NEW_ACTIONS = [
  { label: "Send Email", icon: Mail, href: "/inbox/compose" },
  { label: "Get on a phone call", icon: Phone, href: "/appointments/new" },
  { label: "Create a meeting", icon: UsersIcon, href: "/appointments/new" },
  { label: "Send SMS", icon: MessageSquare, href: "/inbox/compose" },
  { label: "Create Task", icon: ListTodo, href: "/tasks/new" },
];

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function ActionsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("mentions");
  const [search, setSearch] = useState("");
  const [loadingLeft, setLoadingLeft] = useState(true);
  const [loadingRight, setLoadingRight] = useState(true);

  // Left panel: notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Right sidebar
  const [todayEvents, setTodayEvents] = useState<TodayEvent[]>([]);
  const [todayTasks, setTodayTasks] = useState<TodayTask[]>([]);
  const [todayAlerts, setTodayAlerts] = useState<Notification[]>([]);

  // My Lists
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState("");
  const [myLists, setMyLists] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("crm_my_lists");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [listData, setListData] = useState<Record<string, { label: string; count: number }>>({});

  // Fetch notifications for left panel
  const fetchNotifications = useCallback(async () => {
    setLoadingLeft(true);
    try {
      const data = await getNotifications({ page_size: "50" });
      setNotifications(data.results || []);
    } catch {
      /* empty */
    } finally {
      setLoadingLeft(false);
    }
  }, []);

  // Fetch right sidebar data
  const fetchSidebar = useCallback(async () => {
    setLoadingRight(true);
    const today = format(new Date(), "yyyy-MM-dd");
    try {
      const [appts, tasks, alerts] = await Promise.all([
        getAppointments({
          start_datetime_after: `${today}T00:00:00`,
          start_datetime_before: `${today}T23:59:59`,
          page_size: "10",
        }).catch(() => ({ results: [] })),
        getTasks({
          due_date: today,
          page_size: "10",
        }).catch(() => ({ results: [] })),
        getNotifications({
          is_read: "false",
          page_size: "10",
        }).catch(() => ({ results: [] })),
      ]);

      setTodayEvents(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (appts.results || []).map((a: any) => ({
          id: String(a.id),
          title: String(a.title || ""),
          start: String(a.start_datetime || ""),
          status: String(a.status || ""),
        }))
      );
      setTodayTasks(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (tasks.results || []).map((t: any) => ({
          id: String(t.id),
          title: String(t.title || ""),
          due_date: t.due_date ? String(t.due_date) : null,
          status: String(t.status || ""),
        }))
      );
      setTodayAlerts(alerts.results || []);
    } catch {
      /* empty */
    } finally {
      setLoadingRight(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchSidebar();
  }, [fetchNotifications, fetchSidebar]);

  // Fetch list counts for My Lists
  useEffect(() => {
    const MODULE_LABELS: Record<string, string> = {
      cases: "Cases",
      contacts: "Contacts",
      corporations: "Organizations",
      quotes: "Quotes",
      tasks: "Tasks",
      documents: "Documents",
      appointments: "Appointments",
      internal_tickets: "Internal Tickets",
    };
    if (myLists.length === 0) return;
    myLists.forEach(async (mod) => {
      try {
        let count = 0;
        if (mod === "contacts") {
          const res = await getContacts({ page_size: "1" });
          count = res.count ?? 0;
        } else if (mod === "tasks") {
          const res = await getTasks({ page_size: "1" });
          count = res.count ?? 0;
        }
        setListData((prev) => ({
          ...prev,
          [mod]: { label: MODULE_LABELS[mod] || mod, count },
        }));
      } catch {
        setListData((prev) => ({
          ...prev,
          [mod]: { label: MODULE_LABELS[mod] || mod, count: 0 },
        }));
      }
    });
  }, [myLists]);

  // Add list handler
  const handleAddList = () => {
    if (!selectedModule || myLists.includes(selectedModule)) return;
    const updated = [...myLists, selectedModule];
    setMyLists(updated);
    localStorage.setItem("crm_my_lists", JSON.stringify(updated));
    setSelectedModule("");
    setListDialogOpen(false);
  };

  const handleRemoveList = (mod: string) => {
    const updated = myLists.filter((m) => m !== mod);
    setMyLists(updated);
    localStorage.setItem("crm_my_lists", JSON.stringify(updated));
  };

  // Filter notifications by tab and search
  const filteredNotifications = notifications.filter((n) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !n.title.toLowerCase().includes(q) &&
        !n.message.toLowerCase().includes(q)
      )
        return false;
    }
    // Tab filtering: simple heuristic based on notification type
    if (activeTab === "mentions") {
      return true; // Show all in mentions for now
    }
    if (activeTab === "updates") {
      return ["case_status_changed", "system"].includes(n.notification_type);
    }
    if (activeTab === "engagements") {
      return [
        "email_assigned",
        "email_no_reply",
        "workflow_triggered",
      ].includes(n.notification_type);
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Actions" />

      <div className="flex gap-6 min-h-[calc(100vh-180px)]">
        {/* ── Left Panel ── */}
        <div className="flex-1 min-w-0">
          {/* Tabs + actions row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      activeTab === tab.key
                        ? "text-foreground border-b-2 border-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="size-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Settings className="mr-1.5 size-4" />
                Alert rules
              </Button>
              <Button variant="ghost" size="sm">
                <MessageCircle className="mr-1.5 size-4" />
                New Comment
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search for notification"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Notifications list */}
          {loadingLeft ? (
            <LoadingSpinner />
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="mb-4 rounded-full bg-muted p-6">
                <AtSign className="size-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-primary mb-1">
                Time to chill...
              </h3>
              <p className="text-sm text-muted-foreground">
                {activeTab === "mentions"
                  ? "Comments you're mentioned in will appear here"
                  : activeTab === "updates"
                    ? "Record updates you follow will appear here"
                    : "Engagement activities will appear here"}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredNotifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (n.action_url) router.push(n.action_url);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-md transition-colors hover:bg-muted/50",
                    !n.is_read && "bg-muted/30"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "mt-0.5 rounded-full p-1.5",
                        n.severity === "error"
                          ? "bg-red-100 text-red-600"
                          : n.severity === "warning"
                            ? "bg-amber-100 text-amber-600"
                            : n.severity === "success"
                              ? "bg-green-100 text-green-600"
                              : "bg-blue-100 text-blue-600"
                      )}
                    >
                      <AlertCircle className="size-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm",
                          !n.is_read && "font-semibold"
                        )}
                      >
                        {n.title}
                      </p>
                      {n.message && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {n.message}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(n.created_at), "MMM d, h:mm a")}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Right Sidebar ── */}
        <div className="w-80 shrink-0 space-y-4">
          {/* My Actions header */}
          <Card className="py-0 gap-0">
            <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
              <CardTitle className="text-base">My Actions</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    New Action
                    <ChevronDown className="ml-1 size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {NEW_ACTIONS.map((action) => {
                    const Icon = action.icon;
                    return (
                      <DropdownMenuItem
                        key={action.label}
                        onClick={() => router.push(action.href)}
                      >
                        <Icon className="mr-2 size-4" />
                        {action.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
          </Card>

          {/* Today's Events */}
          <Card className="py-0 gap-0">
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="size-4" />
                Today&apos;s Events
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-3">
              {loadingRight ? (
                <LoadingSpinner />
              ) : todayEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  You have no events
                </p>
              ) : (
                <div className="space-y-2">
                  {todayEvents.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => router.push(`/appointments/${e.id}`)}
                      className="w-full text-left flex items-center gap-2 text-sm hover:bg-muted/50 rounded px-2 py-1 transition-colors"
                    >
                      <Clock className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{e.title}</span>
                      {e.start && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          {format(new Date(e.start), "h:mm a")}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Today's Tasks */}
          <Card className="py-0 gap-0">
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ListTodo className="size-4" />
                Today&apos;s Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-3">
              {loadingRight ? (
                <LoadingSpinner />
              ) : todayTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Tasks that are due today &amp; tasks in progress will be shown
                  here
                </p>
              ) : (
                <div className="space-y-2">
                  {todayTasks.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => router.push(`/tasks/${t.id}`)}
                      className="w-full text-left flex items-center gap-2 text-sm hover:bg-muted/50 rounded px-2 py-1 transition-colors"
                    >
                      <ListTodo className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{t.title}</span>
                      <Badge variant="outline" className="ml-auto text-xs">
                        {t.status}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Today's Alerts */}
          <Card className="py-0 gap-0">
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="size-4" />
                Today&apos;s Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-3">
              {loadingRight ? (
                <LoadingSpinner />
              ) : todayAlerts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Activity, Engagements and smart alerts will appear here
                </p>
              ) : (
                <div className="space-y-2">
                  {todayAlerts.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => {
                        if (a.action_url) router.push(a.action_url);
                      }}
                      className="w-full text-left flex items-start gap-2 text-sm hover:bg-muted/50 rounded px-2 py-1 transition-colors"
                    >
                      <AlertCircle className="size-3.5 mt-0.5 text-amber-500 shrink-0" />
                      <span className="truncate">{a.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Lists */}
          <Card className="py-0 gap-0">
            <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b">
              <CardTitle className="text-sm font-semibold">My Lists</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setListDialogOpen(true)}
              >
                <ListPlus className="mr-1.5 size-3.5" />
                Add Lists
              </Button>
            </CardHeader>
            {myLists.length > 0 && (
              <CardContent className="px-4 py-3">
                <div className="space-y-1">
                  {myLists.map((mod) => {
                    const info = listData[mod];
                    return (
                      <div
                        key={mod}
                        className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-muted/50 transition-colors group"
                      >
                        <button
                          className="flex-1 text-left truncate"
                          onClick={() => router.push(`/${mod.replace("_", "-")}`)}
                        >
                          {info?.label || mod}
                          {info && info.count > 0 && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {info.count}
                            </Badge>
                          )}
                        </button>
                        <button
                          className="opacity-0 group-hover:opacity-100 ml-2 text-muted-foreground hover:text-foreground transition-opacity"
                          onClick={() => handleRemoveList(mod)}
                        >
                          <span className="text-xs">✕</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      {/* ── Select List Dialog ── */}
      <Dialog open={listDialogOpen} onOpenChange={setListDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select List</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-sm text-muted-foreground">Select Module</label>
            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger>
                <SelectValue placeholder="Select an Option" />
              </SelectTrigger>
              <SelectContent>
                {[
                  { value: "cases", label: "Cases" },
                  { value: "contacts", label: "Contacts" },
                  { value: "corporations", label: "Organizations" },
                  { value: "quotes", label: "Quotes" },
                  { value: "tasks", label: "Tasks" },
                  { value: "documents", label: "Documents" },
                  { value: "appointments", label: "Appointments" },
                  { value: "internal_tickets", label: "Internal Tickets" },
                ]
                  .filter((m) => !myLists.includes(m.value))
                  .map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setListDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddList} disabled={!selectedModule}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
