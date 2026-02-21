"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  MessageSquare,
  Calendar,
  Receipt,
  Package,
  Wrench,
  FileCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/portal/dashboard", icon: LayoutDashboard },
  { label: "Cases", href: "/portal/cases", icon: Briefcase },
  { label: "Documents", href: "/portal/documents", icon: FileText },
  { label: "Messages", href: "/portal/messages", icon: MessageSquare },
  { label: "Appointments", href: "/portal/appointments", icon: Calendar },
];

const BILLING_ITEMS = [
  { label: "Billing", href: "/portal/billing", icon: Receipt },
  { label: "Products", href: "/portal/billing/products", icon: Package },
  { label: "Services", href: "/portal/billing/services", icon: Wrench },
  { label: "Invoices", href: "/portal/billing/invoices", icon: FileText },
  { label: "Quotes", href: "/portal/billing/quotes", icon: FileCheck },
];

export function PortalSidebar() {
  const pathname = usePathname();

  const renderNavItem = (item: { label: string; href: string; icon: React.ComponentType<{ className?: string }> }) => {
    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
            : "text-muted-foreground"
        )}
      >
        <Icon className="size-4" />
        {item.label}
      </Link>
    );
  };

  return (
    <aside className="hidden w-56 shrink-0 border-r bg-card lg:block">
      <div className="flex h-14 items-center border-b px-4">
        <span className="text-lg font-bold text-primary">Client Portal</span>
      </div>
      <nav className="flex flex-col gap-1 p-2">
        {NAV_ITEMS.map(renderNavItem)}

        {/* Billing Section */}
        <div className="mt-4 border-t pt-4">
          <span className="px-3 text-xs font-semibold uppercase text-muted-foreground">
            Billing
          </span>
          <div className="mt-2 flex flex-col gap-1">
            {BILLING_ITEMS.map(renderNavItem)}
          </div>
        </div>
      </nav>
    </aside>
  );
}
