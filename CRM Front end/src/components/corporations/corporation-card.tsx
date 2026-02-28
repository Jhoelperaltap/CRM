"use client";

import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Mail, Phone, MapPin, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CorporationListItem } from "@/types";

interface CorporationCardProps {
  corporation: CorporationListItem;
}

export function CorporationCard({ corporation }: CorporationCardProps) {
  const router = useRouter();

  const initials = corporation.name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  const handleClick = () => {
    router.push(`/corporations/${corporation.id}`);
  };

  const formatEntityType = (type?: string) => {
    if (!type) return null;
    const labels: Record<string, string> = {
      sole_proprietorship: "Sole Proprietorship",
      partnership: "Partnership",
      llc: "LLC",
      s_corp: "S Corporation",
      c_corp: "C Corporation",
      nonprofit: "Nonprofit",
      trust: "Trust",
      estate: "Estate",
      other: "Other",
    };
    return labels[type] || type;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "active":
        return "border-green-200 bg-green-50 text-green-700";
      case "inactive":
        return "border-gray-200 bg-gray-50 text-gray-600";
      case "dissolved":
        return "border-red-200 bg-red-50 text-red-600";
      default:
        return "border-gray-200 bg-gray-50 text-gray-600";
    }
  };

  const address = [corporation.billing_city, corporation.billing_state]
    .filter(Boolean)
    .join(", ");

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow group bg-white shadow-sm"
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <Avatar className="h-12 w-12 flex-shrink-0">
            <AvatarFallback className="bg-blue-600 text-white text-sm font-medium">
              {initials || "?"}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1">
            {/* Name and Status */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                  {corporation.name}
                </h3>
                {corporation.account_number && (
                  <p className="text-xs text-muted-foreground">
                    ID: {corporation.account_number}
                  </p>
                )}
              </div>
              {corporation.status && (
                <Badge
                  variant="outline"
                  className={cn("text-xs flex-shrink-0", getStatusBadgeColor(corporation.status))}
                >
                  {corporation.status}
                </Badge>
              )}
            </div>

            {/* EIN */}
            {corporation.ein && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Hash className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">EIN: ***-**-{corporation.ein.slice(-4)}</span>
              </div>
            )}

            {/* Entity Type Badge */}
            {corporation.entity_type && (
              <div className="pt-1">
                <Badge variant="secondary" className="text-xs">
                  {formatEntityType(corporation.entity_type)}
                </Badge>
              </div>
            )}

            {/* Industry */}
            {corporation.industry && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{corporation.industry}</span>
              </div>
            )}

            {/* Address */}
            {address && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{address}</span>
              </div>
            )}

            {/* Contact Info */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
              {corporation.email && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span className="truncate max-w-[120px]">{corporation.email}</span>
                </div>
              )}
              {corporation.phone && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{corporation.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
