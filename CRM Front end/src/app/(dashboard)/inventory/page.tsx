"use client";

import Link from "next/link";
import {
  Package,
  Wrench,
  BookOpen,
  FileText,
  ShoppingCart,
  ClipboardList,
  Users2,
  CreditCard,
  Printer,
  Mail,
  Hammer,
  Landmark,
  Receipt,
  ScrollText,
  DollarSign,
  ShieldCheck,
  BarChart3,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

interface MenuItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

interface MenuColumn {
  heading: string;
  sections: MenuSection[];
}

const columns: MenuColumn[] = [
  {
    heading: "MODULES",
    sections: [
      {
        title: "Catalog",
        items: [
          { label: "Products", href: "/inventory/products", icon: Package },
          { label: "Services", href: "/inventory/services", icon: Wrench },
          { label: "Price Books", href: "/inventory/price-books", icon: BookOpen },
        ],
      },
      {
        title: "Order Fulfillment",
        items: [
          { label: "Invoices", href: "/inventory/invoices", icon: FileText },
          { label: "Sales Orders", href: "/inventory/sales-orders", icon: ShoppingCart },
          { label: "Purchase Orders", href: "/inventory/purchase-orders", icon: ClipboardList },
          { label: "Vendors", href: "/inventory/vendors", icon: Users2 },
          { label: "Payments", href: "/inventory/payments", icon: CreditCard },
        ],
      },
    ],
  },
  {
    heading: "",
    sections: [
      {
        title: "Inventory Tools",
        items: [
          { label: "Print Templates", href: "/settings/email-templates", icon: Printer },
          { label: "Email Templates", href: "/settings/email-templates", icon: Mail },
          { label: "Work Orders", href: "/inventory/work-orders", icon: Hammer },
          { label: "Assets", href: "/inventory/assets", icon: Landmark },
        ],
      },
    ],
  },
  {
    heading: "CONFIGURATION",
    sections: [
      {
        title: "Inventory Administration",
        items: [
          { label: "Tax Management", href: "/settings/tax-management", icon: Receipt },
          { label: "Terms and Conditions", href: "/settings/terms-conditions", icon: ScrollText },
          { label: "Payments & Subscriptions Settings", href: "/settings/payment-settings", icon: DollarSign },
          { label: "Approvals Configuration", href: "/settings/approvals", icon: ShieldCheck },
          { label: "Stock Management", href: "/settings/stock-management", icon: BarChart3 },
        ],
      },
    ],
  },
];

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" description="Manage products, orders, and inventory" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {columns.map((col, ci) => (
          <div key={ci} className="space-y-6">
            {col.heading && (
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {col.heading}
              </h3>
            )}
            {col.sections.map((section) => (
              <div key={section.title} className="space-y-1">
                <h4 className="text-sm font-semibold mb-2">{section.title}</h4>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href + item.label}
                      href={item.href}
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <Icon className="size-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
