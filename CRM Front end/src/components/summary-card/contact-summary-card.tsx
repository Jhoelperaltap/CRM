"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Mail,
  Phone,
  Building2,
  MapPin,
  Star,
  StarOff,
  Briefcase,
  Calendar,
  FileText,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toggleStar } from "@/lib/api/contacts";
import api from "@/lib/api";
import type { Contact } from "@/types";

interface ContactSummaryCardProps {
  contact: Contact;
  className?: string;
}

interface Stats {
  cases: number;
  appointments: number;
  documents: number;
  quotes: number;
}

export function ContactSummaryCard({ contact, className }: ContactSummaryCardProps) {
  const [isStarred, setIsStarred] = useState(contact.is_starred);
  const [stats, setStats] = useState<Stats>({ cases: 0, appointments: 0, documents: 0, quotes: 0 });

  useEffect(() => {
    async function fetchStats() {
      try {
        const [casesRes, appointmentsRes, documentsRes, quotesRes] = await Promise.allSettled([
          api.get("/cases/", { params: { contact: contact.id, page_size: 1 } }),
          api.get("/appointments/", { params: { contact: contact.id, page_size: 1 } }),
          api.get("/documents/", { params: { contact: contact.id, page_size: 1 } }),
          api.get("/quotes/", { params: { contact: contact.id, page_size: 1 } }),
        ]);

        setStats({
          cases: casesRes.status === "fulfilled" ? casesRes.value.data.count || 0 : 0,
          appointments: appointmentsRes.status === "fulfilled" ? appointmentsRes.value.data.count || 0 : 0,
          documents: documentsRes.status === "fulfilled" ? documentsRes.value.data.count || 0 : 0,
          quotes: quotesRes.status === "fulfilled" ? quotesRes.value.data.count || 0 : 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    }

    fetchStats();
  }, [contact.id]);

  const handleToggleStar = async () => {
    try {
      const result = await toggleStar(contact.id);
      setIsStarred(result.starred);
    } catch (error) {
      console.error("Error toggling star:", error);
    }
  };

  const getInitials = () => {
    const first = contact.first_name?.[0] || "";
    const last = contact.last_name?.[0] || "";
    return (first + last).toUpperCase() || contact.email?.[0]?.toUpperCase() || "?";
  };

  const fullAddress = [
    contact.mailing_street,
    contact.mailing_city,
    contact.mailing_state,
    contact.mailing_zip,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-start gap-6">
          {/* Avatar and basic info */}
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20 border-2 border-primary/10">
              <AvatarImage src={contact.image || undefined} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {getInitials()}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">
                  {contact.full_name || `${contact.first_name} ${contact.last_name}`}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleToggleStar}
                >
                  {isStarred ? (
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ) : (
                    <StarOff className="h-5 w-5 text-muted-foreground" />
                  )}
                </Button>
              </div>

              {contact.title && (
                <p className="text-muted-foreground">
                  {contact.title}
                  {contact.department && ` - ${contact.department}`}
                </p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Badge variant={contact.status === "active" ? "default" : "secondary"}>
                  {contact.status}
                </Badge>
                {contact.corporation && (
                  <Link
                    href={`/corporations/${contact.corporation.id}`}
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    {contact.corporation.name}
                  </Link>
                )}
              </div>
            </div>
          </div>

          <Separator orientation="vertical" className="h-20 hidden lg:block" />

          {/* Contact details */}
          <div className="hidden lg:flex flex-col gap-2 text-sm">
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <Mail className="h-4 w-4" />
                {contact.email}
              </a>
            )}
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <Phone className="h-4 w-4" />
                {contact.phone}
              </a>
            )}
            {fullAddress && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="truncate max-w-[250px]">{fullAddress}</span>
              </div>
            )}
          </div>

          <Separator orientation="vertical" className="h-20 hidden xl:block" />

          {/* Stats */}
          <div className="hidden xl:flex items-center gap-6 ml-auto">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-blue-600">
                <Briefcase className="h-4 w-4" />
                <span className="text-2xl font-bold">{stats.cases}</span>
              </div>
              <p className="text-xs text-muted-foreground">Cases</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-indigo-600">
                <Calendar className="h-4 w-4" />
                <span className="text-2xl font-bold">{stats.appointments}</span>
              </div>
              <p className="text-xs text-muted-foreground">Appointments</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-amber-600">
                <FileText className="h-4 w-4" />
                <span className="text-2xl font-bold">{stats.documents}</span>
              </div>
              <p className="text-xs text-muted-foreground">Documents</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-green-600">
                <DollarSign className="h-4 w-4" />
                <span className="text-2xl font-bold">{stats.quotes}</span>
              </div>
              <p className="text-xs text-muted-foreground">Quotes</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
