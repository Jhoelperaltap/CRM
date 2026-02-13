"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationItem } from "@/components/notifications/notification-item";
import {
  getNotifications,
  markRead,
  markAllRead,
} from "@/lib/api/notifications";
import { Notification } from "@/types/notifications";
import { useRouter } from "next/navigation";

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page) };
      if (filter === "unread") params.is_read = "false";
      const data = await getNotifications(params);
      setNotifications(data.results);
      setTotalCount(data.count);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, is_read: true } : n
        )
      );
    }
    if (notification.action_url) {
      router.push(notification.action_url);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Notifications"
        actions={
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            Mark all as read
          </Button>
        }
      />

      <div className="flex gap-2">
        <Badge
          variant={filter === "all" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => {
            setFilter("all");
            setPage(1);
          }}
        >
          All
        </Badge>
        <Badge
          variant={filter === "unread" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => {
            setFilter("unread");
            setPage(1);
          }}
        >
          Unread
        </Badge>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : notifications.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No notifications to show.
        </p>
      ) : (
        <div className="space-y-1 rounded-md border">
          {notifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onClick={handleClick}
            />
          ))}
        </div>
      )}

      {totalCount > 25 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page * 25 >= totalCount}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
