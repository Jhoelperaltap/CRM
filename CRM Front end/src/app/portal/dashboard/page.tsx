"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePortalAuthStore } from "@/stores/portal-auth-store";
import { portalGetCases, portalGetMessages, portalGetAppointments } from "@/lib/api/portal";
import { Briefcase, MessageSquare, Calendar, FileText } from "lucide-react";

export default function PortalDashboardPage() {
  const contact = usePortalAuthStore((s) => s.contact);
  const [caseCount, setCaseCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [upcomingAppointments, setUpcomingAppointments] = useState(0);

  useEffect(() => {
    portalGetCases()
      .then((cases) => setCaseCount(cases.length))
      .catch(() => {});
    portalGetMessages()
      .then((msgs) => setUnreadMessages(msgs.filter((m) => !m.is_read).length))
      .catch(() => {});
    portalGetAppointments()
      .then((appts) => {
        const now = new Date().toISOString();
        setUpcomingAppointments(
          appts.filter((a) => a.start_datetime > now).length
        );
      })
      .catch(() => {});
  }, []);

  const cards = [
    {
      label: "Active Cases",
      value: caseCount,
      icon: Briefcase,
      href: "/portal/cases",
      color: "text-blue-500",
    },
    {
      label: "Unread Messages",
      value: unreadMessages,
      icon: MessageSquare,
      href: "/portal/messages",
      color: "text-green-500",
    },
    {
      label: "Upcoming Appointments",
      value: upcomingAppointments,
      icon: Calendar,
      href: "/portal/appointments",
      color: "text-purple-500",
    },
    {
      label: "Documents",
      value: null,
      icon: FileText,
      href: "/portal/documents",
      color: "text-orange-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome, {contact?.first_name || "Client"}
        </h1>
        <p className="text-muted-foreground">
          Here is a summary of your account.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="rounded-lg border bg-card p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <Icon className={`size-8 ${card.color}`} />
                <div>
                  <div className="text-2xl font-bold">
                    {card.value !== null ? card.value : "--"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {card.label}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-5">
          <h2 className="mb-3 text-lg font-semibold">Quick Actions</h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/portal/documents"
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
            >
              Upload Document
            </Link>
            <Link
              href="/portal/messages"
              className="rounded-md bg-secondary px-4 py-2 text-sm text-secondary-foreground hover:bg-secondary/80"
            >
              Send Message
            </Link>
            <Link
              href="/portal/cases"
              className="rounded-md bg-secondary px-4 py-2 text-sm text-secondary-foreground hover:bg-secondary/80"
            >
              View Cases
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
