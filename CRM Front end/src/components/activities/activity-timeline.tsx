"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  Mail,
  Send,
  FileUp,
  Share2,
  Eye,
  StickyNote,
  MessageSquare,
  Calendar,
  CalendarCheck,
  CalendarX,
  FolderPlus,
  FolderPen,
  FolderCheck,
  ListPlus,
  CheckCircle,
  Pencil,
  ArrowRightCircle,
  Phone,
  Users,
  Plus,
  Link,
  Unlink,
  Filter,
  Loader2,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DatePicker } from "@/components/ui/date-picker";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { getActivities, getActivityTypes } from "@/lib/api/activities";
import type { Activity, ActivityType } from "@/types/activities";

const ACTIVITY_ICONS: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
  email_sent: Send,
  email_received: Mail,
  document_uploaded: FileUp,
  document_shared: Share2,
  document_viewed: Eye,
  note_added: StickyNote,
  comment_added: MessageSquare,
  appointment_scheduled: Calendar,
  appointment_completed: CalendarCheck,
  appointment_cancelled: CalendarX,
  case_created: FolderPlus,
  case_updated: FolderPen,
  case_closed: FolderCheck,
  task_created: ListPlus,
  task_completed: CheckCircle,
  field_changed: Pencil,
  status_changed: ArrowRightCircle,
  call_logged: Phone,
  meeting_logged: Users,
  record_created: Plus,
  record_updated: Pencil,
  linked: Link,
  unlinked: Unlink,
};

const ACTIVITY_COLORS: Record<ActivityType, { text: string; bg: string }> = {
  email_sent: { text: "text-blue-600", bg: "bg-blue-100" },
  email_received: { text: "text-blue-600", bg: "bg-blue-100" },
  document_uploaded: { text: "text-green-600", bg: "bg-green-100" },
  document_shared: { text: "text-green-600", bg: "bg-green-100" },
  document_viewed: { text: "text-gray-600", bg: "bg-gray-100" },
  note_added: { text: "text-yellow-600", bg: "bg-yellow-100" },
  comment_added: { text: "text-purple-600", bg: "bg-purple-100" },
  appointment_scheduled: { text: "text-indigo-600", bg: "bg-indigo-100" },
  appointment_completed: { text: "text-green-600", bg: "bg-green-100" },
  appointment_cancelled: { text: "text-red-600", bg: "bg-red-100" },
  case_created: { text: "text-blue-600", bg: "bg-blue-100" },
  case_updated: { text: "text-blue-600", bg: "bg-blue-100" },
  case_closed: { text: "text-green-600", bg: "bg-green-100" },
  task_created: { text: "text-orange-600", bg: "bg-orange-100" },
  task_completed: { text: "text-green-600", bg: "bg-green-100" },
  field_changed: { text: "text-gray-600", bg: "bg-gray-100" },
  status_changed: { text: "text-blue-600", bg: "bg-blue-100" },
  call_logged: { text: "text-teal-600", bg: "bg-teal-100" },
  meeting_logged: { text: "text-indigo-600", bg: "bg-indigo-100" },
  record_created: { text: "text-green-600", bg: "bg-green-100" },
  record_updated: { text: "text-blue-600", bg: "bg-blue-100" },
  linked: { text: "text-blue-600", bg: "bg-blue-100" },
  unlinked: { text: "text-gray-600", bg: "bg-gray-100" },
};

interface ActivityTimelineProps {
  entityType: "contact" | "corporation" | "case";
  entityId: string;
  className?: string;
  maxHeight?: string;
}

export function ActivityTimeline({
  entityType,
  entityId,
  className,
  maxHeight = "600px",
}: ActivityTimelineProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [activityTypes, setActivityTypes] = useState<{ value: string; label: string }[]>([]);

  const fetchActivities = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const filters: Record<string, string | number> = {
          entity_type: entityType,
          entity_id: entityId,
          page: pageNum,
          page_size: 20,
        };

        if (filterType && filterType !== "all") {
          filters.activity_type = filterType;
        }

        if (startDate) {
          filters.start_date = format(startDate, "yyyy-MM-dd");
        }

        if (endDate) {
          filters.end_date = format(endDate, "yyyy-MM-dd");
        }

        const response = await getActivities(filters);

        if (append) {
          setActivities((prev) => [...prev, ...response.results]);
        } else {
          setActivities(response.results);
        }

        setHasMore(!!response.next);
        setPage(pageNum);
      } catch (error) {
        console.error("Error fetching activities:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [entityType, entityId, filterType, startDate, endDate]
  );

  useEffect(() => {
    fetchActivities(1, false);
  }, [fetchActivities]);

  useEffect(() => {
    async function loadActivityTypes() {
      try {
        const types = await getActivityTypes();
        setActivityTypes(types);
      } catch (error) {
        console.error("Error loading activity types:", error);
      }
    }
    loadActivityTypes();
  }, []);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchActivities(page + 1, true);
    }
  };

  const handleRefresh = () => {
    fetchActivities(1, false);
  };

  const clearFilters = () => {
    setFilterType("all");
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const hasActiveFilters = filterType !== "all" || startDate || endDate;

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header with filters */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <h3 className="text-lg font-semibold">Activity Timeline</h3>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Activity Type Filter */}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              {activityTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Range Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="h-4 w-4" />
                Date Range
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4" align="end">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  <DatePicker
                    date={startDate}
                    setDate={setStartDate}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">End Date</label>
                  <DatePicker
                    date={endDate}
                    setDate={setEndDate}
                    className="mt-1"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}

          <Button variant="ghost" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <ScrollArea style={{ maxHeight }} className="pr-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
            <p>No activities found</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-0">
              {activities.map((activity, index) => {
                const IconComponent = ACTIVITY_ICONS[activity.activity_type] || MessageSquare;
                const colors = ACTIVITY_COLORS[activity.activity_type] || {
                  text: "text-gray-600",
                  bg: "bg-gray-100",
                };

                return (
                  <div key={activity.id} className="relative pl-12 pb-6">
                    {/* Timeline dot */}
                    <div
                      className={cn(
                        "absolute left-2.5 w-5 h-5 rounded-full flex items-center justify-center",
                        colors.bg
                      )}
                    >
                      <IconComponent className={cn("h-3 w-3", colors.text)} />
                    </div>

                    {/* Activity card */}
                    <div className="bg-card border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="text-xs">
                              {activity.activity_type_display}
                            </Badge>
                            {activity.department_name && (
                              <Badge variant="outline" className="text-xs">
                                {activity.department_name}
                              </Badge>
                            )}
                          </div>

                          <h4 className="font-medium mt-2">{activity.title}</h4>

                          {activity.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {activity.description}
                            </p>
                          )}

                          {/* Metadata preview */}
                          {activity.metadata &&
                            Object.keys(activity.metadata).length > 0 && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                {activity.activity_type.includes("email") &&
                                  activity.metadata.subject ? (
                                    <p>Subject: {activity.metadata.subject as string}</p>
                                  ) : null}
                                {activity.activity_type.includes("field_changed") &&
                                  activity.metadata.field_name ? (
                                    <p>
                                      Changed: {activity.metadata.field_name as string}
                                      {activity.metadata.old_value && activity.metadata.new_value ? (
                                        <span>
                                          {" "}
                                          from &quot;{activity.metadata.old_value as string}&quot; to &quot;
                                          {activity.metadata.new_value as string}&quot;
                                        </span>
                                      ) : null}
                                    </p>
                                  ) : null}
                              </div>
                            )}
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {activity.time_ago}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(activity.created_at), "MMM d, h:mm a")}
                          </span>
                        </div>
                      </div>

                      {/* Performed by */}
                      {activity.performed_by && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={activity.performed_by.avatar || undefined} />
                            <AvatarFallback className="text-xs">
                              {activity.performed_by.initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-muted-foreground">
                            {activity.performed_by.full_name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center py-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load More"
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
