"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePortalAuthStore } from "@/stores/portal-auth-store";
import { portalGetCases, portalGetMessages, portalGetAppointments, portalGetDocuments } from "@/lib/api/portal";
import {
  Briefcase,
  MessageSquare,
  Calendar,
  FileText,
  Upload,
  Send,
  Eye,
  ArrowRight,
  TrendingUp,
  Clock,
  Home,
} from "lucide-react";
import { RentalDashboardWidget } from "@/components/portal/rental-dashboard-widget";
import { cn } from "@/lib/utils";

export default function PortalDashboardPage() {
  const contact = usePortalAuthStore((s) => s.contact);
  const [caseCount, setCaseCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [upcomingAppointments, setUpcomingAppointments] = useState(0);
  const [documentCount, setDocumentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      portalGetCases().then((cases) => setCaseCount(cases.length)).catch(() => {}),
      portalGetMessages().then((msgs) => setUnreadMessages(msgs.filter((m) => !m.is_read).length)).catch(() => {}),
      portalGetAppointments().then((appts) => {
        const now = new Date().toISOString();
        setUpcomingAppointments(appts.filter((a) => a.start_datetime > now).length);
      }).catch(() => {}),
      portalGetDocuments().then((docs) => setDocumentCount(docs.length)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const cards = [
    {
      label: "Active Cases",
      value: caseCount,
      icon: Briefcase,
      href: "/portal/cases",
      gradient: "from-amber-500 to-orange-600",
      bgGradient: "from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30",
      iconBg: "bg-amber-100 dark:bg-amber-900/50",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Unread Messages",
      value: unreadMessages,
      icon: MessageSquare,
      href: "/portal/messages",
      gradient: "from-purple-500 to-indigo-600",
      bgGradient: "from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30",
      iconBg: "bg-purple-100 dark:bg-purple-900/50",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
    {
      label: "Appointments",
      value: upcomingAppointments,
      icon: Calendar,
      href: "/portal/appointments",
      gradient: "from-pink-500 to-rose-600",
      bgGradient: "from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-950/30",
      iconBg: "bg-pink-100 dark:bg-pink-900/50",
      iconColor: "text-pink-600 dark:text-pink-400",
    },
    {
      label: "Documents",
      value: documentCount,
      icon: FileText,
      href: "/portal/documents",
      gradient: "from-emerald-500 to-teal-600",
      bgGradient: "from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
  ];

  const quickActions = [
    {
      label: "Upload Document",
      icon: Upload,
      href: "/portal/documents",
      color: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
    },
    {
      label: "Send Message",
      icon: Send,
      href: "/portal/messages",
      color: "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700",
    },
    {
      label: "View Cases",
      icon: Eye,
      href: "/portal/cases",
      color: "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700",
    },
  ];

  // Get current time greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-800 via-slate-900 to-slate-950 p-8">
        {/* Decorative Elements */}
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-32 w-32 rounded-full bg-indigo-500/20 blur-2xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 text-blue-400 mb-2">
            <Clock className="size-4" />
            <span className="text-sm">{getGreeting()}</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, {contact?.first_name || "Client"}!
          </h1>
          <p className="text-white/60 max-w-xl">
            Here&apos;s an overview of your account. Track your cases, check messages, and manage your documents all in one place.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className={cn(
                "group relative overflow-hidden rounded-2xl border p-6 transition-all duration-300",
                "hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none hover:-translate-y-1",
                `bg-gradient-to-br ${card.bgGradient}`
              )}
            >
              {/* Icon */}
              <div className={cn("mb-4 inline-flex rounded-xl p-3", card.iconBg)}>
                <Icon className={cn("size-6", card.iconColor)} />
              </div>

              {/* Content */}
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {card.label}
                  </p>
                  <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
                    {loading ? (
                      <span className="inline-block h-8 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                    ) : (
                      card.value
                    )}
                  </p>
                </div>
                <ArrowRight className="size-5 text-slate-400 transition-transform group-hover:translate-x-1" />
              </div>

              {/* Decorative gradient bar */}
              <div className={cn(
                "absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r",
                card.gradient
              )} />
            </Link>
          );
        })}
      </div>

      {/* Quick Actions & Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <div className="rounded-2xl border bg-white dark:bg-slate-900 p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="size-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Quick Actions
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className={cn(
                    "flex flex-col items-center gap-3 rounded-xl p-4 text-white transition-all duration-200",
                    "hover:scale-105 hover:shadow-lg",
                    action.color
                  )}
                >
                  <Icon className="size-6" />
                  <span className="text-sm font-medium text-center">{action.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Billing Quick Access */}
        <div className="rounded-2xl border bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-blue-100 dark:bg-blue-900/50 p-2">
                <FileText className="size-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Billing & Invoices
              </h2>
            </div>
            <Link
              href="/portal/billing"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
            >
              View All
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/portal/billing/invoices"
              className="flex items-center gap-3 rounded-xl bg-white dark:bg-slate-800 p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="rounded-lg bg-green-100 dark:bg-green-900/50 p-2">
                <FileText className="size-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Invoices</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">View & pay invoices</p>
              </div>
            </Link>
            <Link
              href="/portal/billing/quotes"
              className="flex items-center gap-3 rounded-xl bg-white dark:bg-slate-800 p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="rounded-lg bg-rose-100 dark:bg-rose-900/50 p-2">
                <FileText className="size-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Quotes</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Review quotes</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Rental Properties Widget */}
      <RentalDashboardWidget />
    </div>
  );
}
