"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  LogOut,
  Menu,
  X,
  Bell,
  LayoutDashboard,
  Briefcase,
  FileText,
  MessageSquare,
  Calendar,
  Receipt,
  Package,
  Wrench,
  FileCheck,
  ChevronRight,
  Check,
  AlertCircle,
  Info,
  CheckCircle2,
} from "lucide-react";
import { usePortalAuthStore } from "@/stores/portal-auth-store";
import { portalLogout, portalGetMessages } from "@/lib/api/portal";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/portal/dashboard", icon: LayoutDashboard, color: "text-blue-500" },
  { label: "Cases", href: "/portal/cases", icon: Briefcase, color: "text-amber-500" },
  { label: "Documents", href: "/portal/documents", icon: FileText, color: "text-emerald-500" },
  { label: "Messages", href: "/portal/messages", icon: MessageSquare, color: "text-purple-500" },
  { label: "Appointments", href: "/portal/appointments", icon: Calendar, color: "text-pink-500" },
];

const BILLING_ITEMS = [
  { label: "Billing", href: "/portal/billing", icon: Receipt, color: "text-cyan-500" },
  { label: "Products", href: "/portal/billing/products", icon: Package, color: "text-orange-500" },
  { label: "Services", href: "/portal/billing/services", icon: Wrench, color: "text-indigo-500" },
  { label: "Invoices", href: "/portal/billing/invoices", icon: FileText, color: "text-green-500" },
  { label: "Quotes", href: "/portal/billing/quotes", icon: FileCheck, color: "text-rose-500" },
];

interface Notification {
  id: string;
  type: "message" | "info" | "success" | "warning";
  title: string;
  description: string;
  time: string;
  read: boolean;
  href?: string;
}

export function PortalTopbar() {
  const router = useRouter();
  const pathname = usePathname();
  const contact = usePortalAuthStore((s) => s.contact);
  const clear = usePortalAuthStore((s) => s.clear);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications (messages for now)
  useEffect(() => {
    async function fetchNotifications() {
      try {
        const messages = await portalGetMessages();
        const unreadMessages = messages.filter((m) => !m.is_read);

        const notifs: Notification[] = unreadMessages.slice(0, 5).map((msg) => ({
          id: msg.id,
          type: "message" as const,
          title: msg.subject || "New Message",
          description: msg.body?.substring(0, 60) + (msg.body?.length > 60 ? "..." : "") || "",
          time: new Date(msg.created_at).toLocaleDateString(),
          read: msg.is_read,
          href: "/portal/messages",
        }));

        // Add welcome notification if no messages
        if (notifs.length === 0) {
          notifs.push({
            id: "welcome",
            type: "success",
            title: "Welcome to EJFLOW!",
            description: "Your client portal is ready. Explore your dashboard.",
            time: "Just now",
            read: false,
            href: "/portal/dashboard",
          });
        }

        setNotifications(notifs);
        setUnreadCount(notifs.filter((n) => !n.read).length);
      } catch {
        // Set default notification on error
        setNotifications([{
          id: "welcome",
          type: "info",
          title: "Welcome!",
          description: "Check your messages and cases.",
          time: "Now",
          read: false,
          href: "/portal/dashboard",
        }]);
        setUnreadCount(1);
      }
    }

    fetchNotifications();
  }, []);

  const handleLogout = async () => {
    try {
      await portalLogout();
    } catch {
      // ignore
    }
    clear();
    router.replace("/portal/login");
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "message":
        return <MessageSquare className="size-4 text-purple-500" />;
      case "success":
        return <CheckCircle2 className="size-4 text-green-500" />;
      case "warning":
        return <AlertCircle className="size-4 text-amber-500" />;
      default:
        return <Info className="size-4 text-blue-500" />;
    }
  };

  const renderMobileNavItem = (item: { label: string; href: string; icon: React.ComponentType<{ className?: string }>; color: string }) => {
    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileMenuOpen(false)}
        className={cn(
          "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
          isActive
            ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
            : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50"
        )}
      >
        <Icon className={cn("size-5", item.color)} />
        {item.label}
        {isActive && <ChevronRight className="ml-auto size-4 text-slate-400" />}
      </Link>
    );
  };

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-white/80 backdrop-blur-md px-4 dark:bg-slate-900/80 lg:px-6">
        {/* Mobile Menu Button & Logo */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-blue-500/20">
              EJ
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white">EJFLOW</span>
              <p className="text-xs text-slate-500 dark:text-slate-400">Client</p>
            </div>
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications Dropdown */}
          <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="size-5 text-slate-500" />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              {/* Header */}
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">Notifications</h3>
                  <p className="text-xs text-slate-500">{unreadCount} unread</p>
                </div>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-blue-600 hover:text-blue-700"
                    onClick={markAllAsRead}
                  >
                    <Check className="mr-1 size-3" />
                    Mark all read
                  </Button>
                )}
              </div>

              {/* Notifications List */}
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Bell className="size-10 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm text-slate-500">No notifications</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {notifications.map((notification) => (
                      <Link
                        key={notification.id}
                        href={notification.href || "#"}
                        onClick={() => setNotificationsOpen(false)}
                        className={cn(
                          "flex gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800",
                          !notification.read && "bg-blue-50/50 dark:bg-blue-950/20"
                        )}
                      >
                        <div className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                          notification.type === "message" && "bg-purple-100 dark:bg-purple-900/50",
                          notification.type === "success" && "bg-green-100 dark:bg-green-900/50",
                          notification.type === "warning" && "bg-amber-100 dark:bg-amber-900/50",
                          notification.type === "info" && "bg-blue-100 dark:bg-blue-900/50"
                        )}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn(
                              "text-sm truncate",
                              !notification.read ? "font-semibold text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"
                            )}>
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500 mt-1.5" />
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {notification.description}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            {notification.time}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t p-2">
                <Link
                  href="/portal/messages"
                  onClick={() => setNotificationsOpen(false)}
                  className="flex items-center justify-center gap-1 rounded-lg py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                >
                  View all messages
                  <ChevronRight className="size-4" />
                </Link>
              </div>
            </PopoverContent>
          </Popover>

          {/* User Info */}
          {contact && (
            <div className="hidden items-center gap-3 rounded-full bg-slate-100 py-1.5 pl-1.5 pr-4 dark:bg-slate-800 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold">
                {contact.first_name?.[0]}{contact.last_name?.[0]}
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {contact.first_name} {contact.last_name}
              </span>
            </div>
          )}

          {/* Logout */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
          >
            <LogOut className="mr-1.5 size-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Menu Panel */}
          <div className="absolute inset-y-0 left-0 w-full max-w-xs bg-white dark:bg-slate-900 shadow-2xl">
            {/* Header */}
            <div className="flex h-16 items-center justify-between border-b px-4 bg-gradient-to-r from-slate-800 to-slate-900">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-lg shadow-lg">
                  EJ
                </div>
                <div>
                  <span className="text-lg font-bold text-white">EJFLOW</span>
                  <p className="text-xs text-white/60">Client Portal</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(false)}
                className="text-white hover:bg-white/10"
              >
                <X className="size-5" />
              </Button>
            </div>

            {/* User Card */}
            {contact && (
              <div className="border-b p-4">
                <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 p-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-lg font-bold">
                    {contact.first_name?.[0]}{contact.last_name?.[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {contact.first_name} {contact.last_name}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{contact.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-4">
              <div className="mb-4">
                <span className="px-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Main
                </span>
                <div className="mt-2 flex flex-col gap-1">
                  {NAV_ITEMS.map(renderMobileNavItem)}
                </div>
              </div>

              <div>
                <span className="px-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Billing
                </span>
                <div className="mt-2 flex flex-col gap-1">
                  {BILLING_ITEMS.map(renderMobileNavItem)}
                </div>
              </div>
            </nav>

            {/* Footer */}
            <div className="border-t p-4">
              <Button
                variant="outline"
                className="w-full justify-center gap-2 text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300"
                onClick={handleLogout}
              >
                <LogOut className="size-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
