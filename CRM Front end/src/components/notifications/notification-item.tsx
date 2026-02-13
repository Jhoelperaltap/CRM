"use client";

import { AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Notification } from "@/types/notifications";

const severityConfig = {
  info: { icon: Info, color: "text-blue-500" },
  warning: { icon: AlertTriangle, color: "text-yellow-500" },
  error: { icon: AlertCircle, color: "text-red-500" },
  success: { icon: CheckCircle, color: "text-green-500" },
};

interface NotificationItemProps {
  notification: Notification;
  onClick?: (notification: Notification) => void;
}

export function NotificationItem({
  notification,
  onClick,
}: NotificationItemProps) {
  const { icon: Icon, color } =
    severityConfig[notification.severity] || severityConfig.info;

  return (
    <button
      className={cn(
        "flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted/50",
        !notification.is_read && "bg-muted/20"
      )}
      onClick={() => onClick?.(notification)}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", color)} />
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm", !notification.is_read && "font-medium")}>
          {notification.title}
        </p>
        {notification.message && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {notification.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(notification.created_at).toLocaleString()}
        </p>
      </div>
      {!notification.is_read && (
        <span className="mt-1 size-2 rounded-full bg-primary shrink-0" />
      )}
    </button>
  );
}
