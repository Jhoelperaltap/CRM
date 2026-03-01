"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  MessageSquare,
  Calendar,
  Home,
  Building2,
  Receipt,
  Package,
  Wrench,
  FileCheck,
  ChevronRight,
  User,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePortalAuthStore } from "@/stores/portal-auth-store";
import type { PortalModules } from "@/types/portal";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  module?: keyof PortalModules; // Which module controls visibility
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/portal/dashboard",
    icon: LayoutDashboard,
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    module: "dashboard",
  },
  {
    label: "Cases",
    href: "/portal/cases",
    icon: Briefcase,
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
    module: "cases",
  },
  {
    label: "Documents",
    href: "/portal/documents",
    icon: FileText,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
    module: "documents",
  },
  {
    label: "Messages",
    href: "/portal/messages",
    icon: MessageSquare,
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
    module: "messages",
  },
  {
    label: "Appointments",
    href: "/portal/appointments",
    icon: Calendar,
    color: "text-pink-400",
    bgColor: "bg-pink-500/20",
    module: "appointments",
  },
  {
    label: "Rental Properties",
    href: "/portal/rentals",
    icon: Home,
    color: "text-teal-400",
    bgColor: "bg-teal-500/20",
    module: "rentals",
  },
  {
    label: "Commercial Buildings",
    href: "/portal/buildings",
    icon: Building2,
    color: "text-violet-400",
    bgColor: "bg-violet-500/20",
    module: "buildings",
  },
];

const BILLING_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/portal/billing",
    icon: Receipt,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
    module: "billing",
  },
  {
    label: "Products",
    href: "/portal/billing/products",
    icon: Package,
    color: "text-orange-400",
    bgColor: "bg-orange-500/20",
    module: "billing",
  },
  {
    label: "Services",
    href: "/portal/billing/services",
    icon: Wrench,
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/20",
    module: "billing",
  },
  {
    label: "Invoices",
    href: "/portal/billing/invoices",
    icon: FileText,
    color: "text-green-400",
    bgColor: "bg-green-500/20",
    module: "billing",
  },
  {
    label: "Quotes",
    href: "/portal/billing/quotes",
    icon: FileCheck,
    color: "text-rose-400",
    bgColor: "bg-rose-500/20",
    module: "billing",
  },
];

const ACCOUNT_ITEMS: NavItem[] = [
  {
    label: "My Profile",
    href: "/portal/settings",
    icon: User,
    color: "text-slate-400",
    bgColor: "bg-slate-500/20",
  },
  {
    label: "Security",
    href: "/portal/settings/security",
    icon: Shield,
    color: "text-red-400",
    bgColor: "bg-red-500/20",
  },
];

export function PortalSidebar() {
  const pathname = usePathname();
  const isModuleEnabled = usePortalAuthStore((s) => s.isModuleEnabled);

  // Filter items based on enabled modules
  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.module || isModuleEnabled(item.module)
  );
  const visibleBillingItems = BILLING_ITEMS.filter(
    (item) => !item.module || isModuleEnabled(item.module)
  );

  const renderNavItem = (item: NavItem) => {
    const isActive = pathname === item.href ||
      (item.href !== "/portal/billing" && pathname.startsWith(`${item.href}/`)) ||
      (item.href === "/portal/billing" && pathname === "/portal/billing");
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-white/15 text-white shadow-lg shadow-black/10"
            : "text-white/70 hover:bg-white/10 hover:text-white"
        )}
      >
        <div className={cn(
          "flex items-center justify-center rounded-lg p-1.5 transition-all duration-200",
          isActive ? item.bgColor : "bg-white/5 group-hover:bg-white/10"
        )}>
          <Icon className={cn("size-4", isActive ? item.color : "text-white/70 group-hover:text-white")} />
        </div>
        <span className="flex-1">{item.label}</span>
        {isActive && (
          <ChevronRight className="size-4 text-white/50" />
        )}
      </Link>
    );
  };

  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      {/* Gradient Background */}
      <div className="flex h-full flex-col bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950">
        {/* Logo Header */}
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-lg shadow-lg shadow-blue-500/30">
            EJ
          </div>
          <div>
            <span className="text-lg font-bold text-white">EJFLOW</span>
            <p className="text-xs text-white/50">Client Portal</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          {/* Main Section */}
          {visibleNavItems.length > 0 && (
            <div className="mb-6">
              <span className="mb-3 flex items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                <span className="h-px flex-1 bg-white/10"></span>
                Main
                <span className="h-px flex-1 bg-white/10"></span>
              </span>
              <div className="flex flex-col gap-1">
                {visibleNavItems.map(renderNavItem)}
              </div>
            </div>
          )}

          {/* Billing Section */}
          {visibleBillingItems.length > 0 && (
            <div className="mb-6">
              <span className="mb-3 flex items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                <span className="h-px flex-1 bg-white/10"></span>
                Billing
                <span className="h-px flex-1 bg-white/10"></span>
              </span>
              <div className="flex flex-col gap-1">
                {visibleBillingItems.map(renderNavItem)}
              </div>
            </div>
          )}

          {/* Account Section */}
          <div>
            <span className="mb-3 flex items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wider text-white/40">
              <span className="h-px flex-1 bg-white/10"></span>
              Account
              <span className="h-px flex-1 bg-white/10"></span>
            </span>
            <div className="flex flex-col gap-1">
              {ACCOUNT_ITEMS.map(renderNavItem)}
            </div>
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 p-4">
          <div className="rounded-xl bg-gradient-to-r from-blue-600/20 to-indigo-600/20 p-4">
            <p className="text-sm font-medium text-white">Need Help?</p>
            <p className="mt-1 text-xs text-white/60">Contact our support team for assistance.</p>
            {isModuleEnabled("messages") && (
              <Link
                href="/portal/messages"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
              >
                Send Message
                <ChevronRight className="size-3" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
