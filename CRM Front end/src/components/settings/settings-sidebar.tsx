"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  Users,
  Shield,
  Key,
  Globe,
  Share2,
  UserPlus,
  History,
  FileText,
  Eye,
  Mail,
  Mailbox,
  FileCode,
  Activity,
  Bell,
  Workflow,
  ScrollText,
  ClipboardList,
  UserCheck,
  FileCheck,
  MessageSquare,
  ShieldCheck,
  ShieldBan,
  Building,
  Briefcase,
  Layout,
  List,
  Stamp,
  Languages,
  Receipt,
  FileCheck2,
  BarChart3,
  Clock,
  ExternalLink,
  Bot,
  Brain,
  Timer,
  MessageCircle,
  Phone,
  Video,
  Database,
  Settings,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarItem {
  label: string;
  href: string;
  icon: LucideIcon;
  iconColor?: string;
  description?: string;
}

interface SidebarGroup {
  id: string;
  title: string;
  icon: LucideIcon;
  iconColor?: string;
  items: SidebarItem[];
}

const groups: SidebarGroup[] = [
  {
    id: "user-management",
    title: "User Management",
    icon: Users,
    iconColor: "text-blue-500",
    items: [
      { label: "Users", href: "/settings/users", icon: Users, iconColor: "text-blue-500", description: "Manage system users" },
      { label: "Roles", href: "/settings/roles", icon: Shield, iconColor: "text-amber-500", description: "Role permissions" },
      { label: "Profiles", href: "/settings/profiles", icon: Key, iconColor: "text-yellow-600", description: "User profiles" },
      { label: "Groups", href: "/settings/groups", icon: UserPlus, iconColor: "text-teal-500", description: "User groups" },
      { label: "Departments", href: "/settings/departments", icon: Briefcase, iconColor: "text-indigo-500", description: "Organization structure" },
      { label: "Branches", href: "/settings/branches", icon: Building, iconColor: "text-slate-500", description: "Office locations" },
    ],
  },
  {
    id: "security",
    title: "Security",
    icon: ShieldCheck,
    iconColor: "text-emerald-500",
    items: [
      { label: "Auth Policy", href: "/settings/auth-policy", icon: Key, iconColor: "text-red-500", description: "Authentication rules" },
      { label: "Two-Factor Auth", href: "/settings/two-factor", icon: ShieldCheck, iconColor: "text-emerald-500", description: "2FA settings" },
      { label: "IP Whitelist", href: "/settings/ip-whitelist", icon: Globe, iconColor: "text-cyan-500", description: "Allowed IPs" },
      { label: "Blocked IPs", href: "/settings/blocked-ips", icon: ShieldBan, iconColor: "text-orange-500", description: "Blocked addresses" },
      { label: "Sharing Rules", href: "/settings/sharing-rules", icon: Share2, iconColor: "text-violet-500", description: "Data sharing" },
    ],
  },
  {
    id: "portal",
    title: "Portal",
    icon: ExternalLink,
    iconColor: "text-green-500",
    items: [
      { label: "Accounts", href: "/settings/portal-accounts", icon: UserCheck, iconColor: "text-green-500", description: "Portal users" },
      { label: "Documents", href: "/settings/portal-documents", icon: FileCheck, iconColor: "text-blue-500", description: "Shared documents" },
      { label: "Messages", href: "/settings/portal-messages", icon: MessageSquare, iconColor: "text-indigo-500", description: "Portal messaging" },
      { label: "Live Chat", href: "/settings/live-chat", icon: MessageCircle, iconColor: "text-emerald-500", description: "Chat settings" },
      { label: "Calls", href: "/settings/calls", icon: Phone, iconColor: "text-blue-500", description: "Call integration" },
      { label: "Video Meetings", href: "/settings/video-meetings", icon: Video, iconColor: "text-cyan-500", description: "Video calls" },
      { label: "AI Chatbot", href: "/settings/chatbot", icon: Bot, iconColor: "text-purple-500", description: "Bot configuration" },
    ],
  },
  {
    id: "email",
    title: "Email",
    icon: Mail,
    iconColor: "text-rose-500",
    items: [
      { label: "Email Settings", href: "/settings/email-accounts", icon: Mail, iconColor: "text-rose-500", description: "SMTP configuration" },
      { label: "Mail Accounts", href: "/settings/mail-accounts", icon: Mailbox, iconColor: "text-sky-500", description: "Connected accounts" },
      { label: "Email Templates", href: "/settings/email-templates", icon: FileCode, iconColor: "text-purple-500", description: "Message templates" },
      { label: "Email Logs", href: "/settings/email-logs", icon: Activity, iconColor: "text-orange-500", description: "Delivery logs" },
    ],
  },
  {
    id: "modules",
    title: "Modules",
    icon: Layout,
    iconColor: "text-blue-500",
    items: [
      { label: "Modules", href: "/settings/modules", icon: Layout, iconColor: "text-blue-500", description: "Module settings" },
      { label: "Picklists", href: "/settings/picklists", icon: List, iconColor: "text-teal-500", description: "Dropdown options" },
      { label: "Labels Editor", href: "/settings/labels-editor", icon: Languages, iconColor: "text-violet-500", description: "UI translations" },
    ],
  },
  {
    id: "automation",
    title: "Automation",
    icon: Workflow,
    iconColor: "text-cyan-500",
    items: [
      { label: "AI Agent", href: "/settings/ai-agent", icon: Brain, iconColor: "text-purple-600", description: "AI configuration" },
      { label: "Notifications", href: "/settings/notifications", icon: Bell, iconColor: "text-yellow-500", description: "Alert rules" },
      { label: "Workflows", href: "/settings/workflows", icon: Workflow, iconColor: "text-cyan-500", description: "Automation rules" },
      { label: "Workflow Logs", href: "/settings/workflow-logs", icon: ScrollText, iconColor: "text-slate-500", description: "Execution history" },
      { label: "Checklist Templates", href: "/settings/checklist-templates", icon: ClipboardList, iconColor: "text-green-500", description: "Task templates" },
      { label: "Approvals", href: "/settings/approvals", icon: Stamp, iconColor: "text-amber-500", description: "Approval flows" },
      { label: "Webforms", href: "/settings/webforms", icon: FileCode, iconColor: "text-indigo-500", description: "Form builder" },
    ],
  },
  {
    id: "configuration",
    title: "Configuration",
    icon: Settings,
    iconColor: "text-slate-500",
    items: [
      { label: "SLA Management", href: "/settings/sla", icon: Timer, iconColor: "text-rose-500", description: "Service levels" },
      { label: "Business Hours", href: "/settings/business-hours", icon: Clock, iconColor: "text-orange-500", description: "Working hours" },
      { label: "Customer Portal", href: "/settings/customer-portal", icon: ExternalLink, iconColor: "text-blue-500", description: "Portal settings" },
    ],
  },
  {
    id: "inventory",
    title: "Inventory",
    icon: BarChart3,
    iconColor: "text-emerald-500",
    items: [
      { label: "Tax Management", href: "/settings/tax-management", icon: Receipt, iconColor: "text-emerald-500", description: "Tax rates" },
      { label: "Terms & Conditions", href: "/settings/terms-conditions", icon: FileCheck2, iconColor: "text-purple-500", description: "Legal terms" },
      { label: "Stock Management", href: "/settings/stock-management", icon: BarChart3, iconColor: "text-blue-500", description: "Inventory settings" },
    ],
  },
  {
    id: "logs",
    title: "Logs",
    icon: History,
    iconColor: "text-slate-500",
    items: [
      { label: "Login History", href: "/settings/login-history", icon: History, iconColor: "text-slate-500", description: "Access logs" },
      { label: "Settings Log", href: "/settings/settings-log", icon: FileText, iconColor: "text-yellow-600", description: "Change history" },
      { label: "PII Access Log", href: "/settings/pii-access-log", icon: Eye, iconColor: "text-red-500", description: "Data access" },
    ],
  },
  {
    id: "system",
    title: "System",
    icon: Database,
    iconColor: "text-blue-600",
    items: [
      { label: "Backups", href: "/settings/backups", icon: Database, iconColor: "text-blue-600", description: "Backup management" },
    ],
  },
];

export function SettingsSidebar() {
  const pathname = usePathname();
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Check if a menu item or any of its children is active
  const isItemActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const isGroupActive = (group: SidebarGroup) => {
    return group.items.some((item) => isItemActive(item.href));
  };

  // Handle mouse enter with delay
  const handleMouseEnter = (groupId: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setActiveGroup(groupId);
  };

  // Handle mouse leave with delay
  const handleMouseLeave = () => {
    if (isPinned) return;
    timeoutRef.current = setTimeout(() => {
      setActiveGroup(null);
    }, 150);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        setActiveGroup(null);
        setIsPinned(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Get active group data for flyout
  const currentGroup = groups.find((g) => g.id === activeGroup);

  return (
    <div ref={sidebarRef} className="flex h-full">
      {/* Icon sidebar */}
      <aside className="w-16 shrink-0 border-r bg-muted/30 flex flex-col">
        {/* Header */}
        <div className="h-14 flex items-center justify-center border-b">
          <Settings className="size-5 text-muted-foreground" />
        </div>

        {/* Navigation icons */}
        <nav className="flex-1 flex flex-col gap-1 p-2 overflow-y-auto">
          {groups.map((group) => {
            const Icon = group.icon;
            const isActive = isGroupActive(group);
            const isHovered = activeGroup === group.id;

            return (
              <button
                key={group.id}
                onMouseEnter={() => handleMouseEnter(group.id)}
                onMouseLeave={handleMouseLeave}
                onClick={() => {
                  if (activeGroup === group.id) {
                    setIsPinned(!isPinned);
                  } else {
                    setActiveGroup(group.id);
                    setIsPinned(true);
                  }
                }}
                className={cn(
                  "group relative flex flex-col items-center justify-center rounded-lg p-2 transition-all duration-200",
                  "hover:bg-accent",
                  (isActive || isHovered) && "bg-accent"
                )}
                title={group.title}
              >
                <Icon
                  className={cn(
                    "size-5 transition-all duration-200",
                    isActive || isHovered
                      ? group.iconColor
                      : "text-muted-foreground",
                    "group-hover:scale-110"
                  )}
                />
                <span
                  className={cn(
                    "mt-0.5 text-[9px] font-medium text-center leading-tight transition-colors max-w-full truncate",
                    isActive || isHovered ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {group.title.split(" ")[0]}
                </span>
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary rounded-r-full" />
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Flyout panel */}
      {currentGroup && (
        <div
          className={cn(
            "w-64 border-r bg-background shadow-lg",
            "animate-in slide-in-from-left-2 fade-in-0 duration-200"
          )}
          onMouseEnter={() => handleMouseEnter(currentGroup.id)}
          onMouseLeave={handleMouseLeave}
        >
          {/* Header */}
          <div className="flex items-center justify-between h-14 px-4 border-b">
            <div className="flex items-center gap-2">
              <currentGroup.icon
                className={cn("size-5", currentGroup.iconColor)}
              />
              <h2 className="text-sm font-semibold">
                {currentGroup.title}
              </h2>
            </div>
            {isPinned && (
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                Pinned
              </span>
            )}
          </div>

          {/* Items list */}
          <div className="p-2 overflow-y-auto max-h-[calc(100vh-8rem)]">
            <div className="space-y-1">
              {currentGroup.items.map((item) => {
                const ItemIcon = item.icon;
                const isActive = isItemActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      setActiveGroup(null);
                      setIsPinned(false);
                    }}
                    className={cn(
                      "group flex items-start gap-3 rounded-lg p-2.5 transition-all duration-200",
                      "hover:bg-accent",
                      isActive && "bg-accent"
                    )}
                  >
                    <div
                      className={cn(
                        "flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-md transition-colors",
                        isActive
                          ? "bg-primary/10"
                          : "bg-muted group-hover:bg-muted/80"
                      )}
                    >
                      <ItemIcon
                        className={cn(
                          "size-4",
                          isActive ? "text-primary" : item.iconColor
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span
                          className={cn(
                            "text-sm font-medium transition-colors",
                            isActive
                              ? "text-primary"
                              : "text-foreground"
                          )}
                        >
                          {item.label}
                        </span>
                        {isActive && (
                          <ChevronRight className="size-3 text-primary" />
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
