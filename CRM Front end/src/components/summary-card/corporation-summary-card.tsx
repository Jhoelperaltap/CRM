"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  Phone,
  Globe,
  MapPin,
  Users,
  Briefcase,
  Calendar,
  FileText,
  DollarSign,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import api from "@/lib/api";
import type { Corporation } from "@/types";

interface CorporationSummaryCardProps {
  corporation: Corporation;
  className?: string;
}

interface Stats {
  cases: number;
  appointments: number;
  documents: number;
  quotes: number;
  contacts: number;
}

export function CorporationSummaryCard({ corporation, className }: CorporationSummaryCardProps) {
  const [stats, setStats] = useState<Stats>({ cases: 0, appointments: 0, documents: 0, quotes: 0, contacts: 0 });

  useEffect(() => {
    async function fetchStats() {
      try {
        const [casesRes, appointmentsRes, documentsRes, quotesRes, contactsRes] = await Promise.allSettled([
          api.get("/cases/", { params: { corporation: corporation.id, page_size: 1 } }),
          api.get("/appointments/", { params: { corporation: corporation.id, page_size: 1 } }),
          api.get("/documents/", { params: { corporation: corporation.id, page_size: 1 } }),
          api.get("/quotes/", { params: { corporation: corporation.id, page_size: 1 } }),
          api.get("/contacts/", { params: { corporation: corporation.id, page_size: 1 } }),
        ]);

        setStats({
          cases: casesRes.status === "fulfilled" ? casesRes.value.data.count || 0 : 0,
          appointments: appointmentsRes.status === "fulfilled" ? appointmentsRes.value.data.count || 0 : 0,
          documents: documentsRes.status === "fulfilled" ? documentsRes.value.data.count || 0 : 0,
          quotes: quotesRes.status === "fulfilled" ? quotesRes.value.data.count || 0 : 0,
          contacts: contactsRes.status === "fulfilled" ? contactsRes.value.data.count || 0 : 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    }

    fetchStats();
  }, [corporation.id]);

  const getInitials = () => {
    return corporation.name
      ?.split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
  };

  const fullAddress = [
    corporation.billing_street,
    corporation.billing_city,
    corporation.billing_state,
    corporation.billing_zip,
  ]
    .filter(Boolean)
    .join(", ");

  const formatEntityType = (type: string) => {
    const labels: Record<string, string> = {
      sole_proprietorship: "Sole Prop",
      partnership: "Partnership",
      llc: "LLC",
      s_corp: "S Corp",
      c_corp: "C Corp",
      nonprofit: "Nonprofit",
      trust: "Trust",
      estate: "Estate",
      other: "Other",
    };
    return labels[type] || type;
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-start gap-6">
          {/* Avatar and basic info */}
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20 border-2 border-primary/10">
              <AvatarImage src={corporation.image || undefined} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {getInitials()}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1">
              <h2 className="text-2xl font-bold">{corporation.name}</h2>

              {corporation.legal_name && corporation.legal_name !== corporation.name && (
                <p className="text-muted-foreground text-sm">{corporation.legal_name}</p>
              )}

              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <Badge variant={corporation.status === "active" ? "default" : "secondary"}>
                  {corporation.status}
                </Badge>
                {corporation.entity_type && (
                  <Badge variant="outline">{formatEntityType(corporation.entity_type)}</Badge>
                )}
                {corporation.industry && (
                  <Badge variant="secondary">{corporation.industry}</Badge>
                )}
              </div>
            </div>
          </div>

          <Separator orientation="vertical" className="h-20 hidden lg:block" />

          {/* Contact details */}
          <div className="hidden lg:flex flex-col gap-2 text-sm">
            {corporation.email && (
              <a
                href={`mailto:${corporation.email}`}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <Mail className="h-4 w-4" />
                {corporation.email}
              </a>
            )}
            {corporation.phone && (
              <a
                href={`tel:${corporation.phone}`}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <Phone className="h-4 w-4" />
                {corporation.phone}
              </a>
            )}
            {corporation.website && (
              <a
                href={corporation.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <Globe className="h-4 w-4" />
                {corporation.website.replace(/^https?:\/\//, "")}
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
              <div className="flex items-center justify-center gap-1 text-purple-600">
                <Users className="h-4 w-4" />
                <span className="text-2xl font-bold">{stats.contacts}</span>
              </div>
              <p className="text-xs text-muted-foreground">Contacts</p>
            </div>
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
