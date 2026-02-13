"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Users,
  Building2,
  Briefcase,
  ClipboardList,
  Calendar,
  CalendarDays,
  FileText,
  CheckSquare,
  BarChart3,
  ScrollText,
  Settings,
  Mail,
  Bell,
  PieChart,
  Ticket,
  TrendingUp,
  Target,
  CalendarCheck,
  Zap,
  FileSignature,
  Boxes,
  Bot,
  ChevronRight,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Subtle color class for the icon */
  iconColor?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
  /** Default icon for the group when collapsed */
  groupIcon: React.ComponentType<{ className?: string }>;
  /** Color for the group icon */
  groupIconColor?: string;
  /** If set, only show this group when the predicate returns true */
  condition?: () => boolean;
}

export function SidebarNav() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);

  const navGroups: NavGroup[] = [
    {
      title: "CRM",
      groupIcon: Users,
      groupIconColor: "text-cyan-300",
      items: [
        { label: "Contacts", href: "/contacts", icon: Users, iconColor: "text-cyan-300" },
        { label: "Corporations", href: "/corporations", icon: Building2, iconColor: "text-slate-300" },
        { label: "Cases", href: "/cases", icon: Briefcase, iconColor: "text-amber-300" },
        { label: "Quotes", href: "/quotes", icon: ClipboardList, iconColor: "text-violet-300" },
      ],
    },
    {
      title: "Office",
      groupIcon: Mail,
      groupIconColor: "text-rose-300",
      items: [
        { label: "Inbox", href: "/inbox", icon: Mail, iconColor: "text-rose-300" },
        { label: "Appointments", href: "/appointments", icon: Calendar, iconColor: "text-teal-300" },
        { label: "Calendar", href: "/appointments/calendar", icon: CalendarDays, iconColor: "text-cyan-300" },
        { label: "Appointment Pages", href: "/appointment-pages", icon: CalendarCheck, iconColor: "text-teal-300" },
        { label: "Documents", href: "/documents", icon: FileText, iconColor: "text-yellow-300" },
        { label: "Esign Documents", href: "/esign-documents", icon: FileSignature, iconColor: "text-emerald-300" },
        { label: "Tasks", href: "/tasks", icon: CheckSquare, iconColor: "text-green-300" },
        { label: "Internal Tickets", href: "/internal-tickets", icon: Ticket, iconColor: "text-orange-300" },
        { label: "Notifications", href: "/notifications", icon: Bell, iconColor: "text-yellow-300" },
        { label: "Actions", href: "/actions", icon: Zap, iconColor: "text-amber-300" },
      ],
    },
    {
      title: "Inventory",
      groupIcon: Boxes,
      groupIconColor: "text-indigo-300",
      items: [
        { label: "Inventory", href: "/inventory", icon: Boxes, iconColor: "text-indigo-300" },
      ],
    },
    {
      title: "Analytics",
      groupIcon: BarChart3,
      groupIconColor: "text-purple-300",
      items: [
        { label: "Dashboard", href: "/dashboard", icon: BarChart3, iconColor: "text-sky-300" },
        { label: "AI Agent", href: "/ai-agent", icon: Bot, iconColor: "text-purple-300" },
        { label: "Sales Insights", href: "/sales-insights", icon: TrendingUp, iconColor: "text-emerald-300" },
        { label: "Forecast & Quota", href: "/forecasts", icon: Target, iconColor: "text-red-300" },
        { label: "Reports", href: "/reports", icon: PieChart, iconColor: "text-purple-300" },
      ],
    },
    {
      title: "Admin",
      groupIcon: Settings,
      groupIconColor: "text-slate-300",
      items: [
        { label: "Settings", href: "/settings", icon: Settings, iconColor: "text-slate-300" },
        { label: "Audit", href: "/audit", icon: ScrollText, iconColor: "text-indigo-300" },
      ],
      condition: () => user?.role?.slug === "admin",
    },
  ];

  // Check if any item in the group is active
  const isGroupActive = (group: NavGroup) => {
    return group.items.some(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
    );
  };

  // Render expanded sidebar (normal view)
  if (!sidebarCollapsed) {
    return (
      <nav className="flex flex-col gap-6">
        {navGroups.map((group) => {
          if (group.condition && !group.condition()) {
            return null;
          }

          return (
            <div key={group.title} className="flex flex-col gap-1">
              <span className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/50">
                {group.title}
              </span>

              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center rounded-lg text-sm font-medium transition-all duration-200",
                      "hover:bg-white/10",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
                      isActive
                        ? "bg-white/15 text-white shadow-sm"
                        : "text-white/70 hover:text-white",
                      "gap-3 px-3 py-2.5"
                    )}
                  >
                    <Icon
                      className={cn(
                        "shrink-0 size-[18px] transition-all duration-200",
                        isActive ? "text-white" : item.iconColor,
                        "group-hover:scale-105"
                      )}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
    );
  }

  // Render collapsed sidebar with hover submenus
  return (
    <nav className="flex flex-col gap-2">
      {navGroups.map((group) => {
        if (group.condition && !group.condition()) {
          return null;
        }

        const GroupIcon = group.groupIcon;
        const groupActive = isGroupActive(group);
        const isHovered = hoveredGroup === group.title;

        return (
          <div
            key={group.title}
            className="relative"
            onMouseEnter={() => setHoveredGroup(group.title)}
            onMouseLeave={() => setHoveredGroup(null)}
          >
            {/* Group icon button */}
            <div
              className={cn(
                "flex items-center justify-center rounded-lg p-2.5 cursor-pointer transition-all duration-200",
                "hover:bg-white/10",
                groupActive
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-white/70 hover:text-white"
              )}
            >
              <GroupIcon
                className={cn(
                  "size-5 transition-all duration-200",
                  groupActive ? "text-white" : group.groupIconColor
                )}
              />
            </div>

            {/* Hover submenu */}
            {isHovered && (
              <div
                className={cn(
                  "absolute left-full top-0 ml-2 z-50",
                  "min-w-[200px] rounded-lg",
                  "bg-popover text-popover-foreground",
                  "border border-border shadow-lg",
                  "animate-in fade-in-0 zoom-in-95 slide-in-from-left-2",
                  "duration-200"
                )}
              >
                {/* Group title */}
                <div className="px-3 py-2 border-b border-border">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.title}
                  </span>
                </div>

                {/* Menu items */}
                <div className="p-1">
                  {group.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          isActive
                            ? "bg-accent text-accent-foreground"
                            : "text-foreground/80"
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-4 shrink-0",
                            isActive ? "text-primary" : item.iconColor
                          )}
                        />
                        <span>{item.label}</span>
                        {isActive && (
                          <ChevronRight className="ml-auto size-4 text-muted-foreground" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
