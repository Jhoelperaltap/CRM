"use client";

import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Mail, Phone, MapPin, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContactListItem } from "@/types";

interface ContactCardProps {
  contact: ContactListItem;
  onStar?: (id: string) => void;
}

export function ContactCard({ contact, onStar }: ContactCardProps) {
  const router = useRouter();

  const initials = `${contact.first_name?.[0] || ""}${contact.last_name?.[0] || ""}`
    .toUpperCase();

  const handleClick = () => {
    router.push(`/contacts/${contact.id}`);
  };

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStar?.(contact.id);
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow group bg-white shadow-sm"
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <Avatar className="h-12 w-12 flex-shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
              {initials || "?"}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1">
            {/* Name and Star */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                  {contact.first_name} {contact.last_name}
                </h3>
                {contact.contact_number && (
                  <p className="text-xs text-muted-foreground">
                    ID: {contact.contact_number}
                  </p>
                )}
              </div>
              <button
                onClick={handleStarClick}
                className="flex-shrink-0 p-1 hover:bg-muted rounded"
              >
                <Star
                  className={cn(
                    "h-4 w-4",
                    contact.is_starred
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  )}
                />
              </button>
            </div>

            {/* Company */}
            {contact.corporation_name && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{contact.corporation_name}</span>
              </div>
            )}

            {/* Address (using mailing_city and mailing_state if available) */}
            {(contact.mailing_city || contact.mailing_state) && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">
                  {[contact.mailing_city, contact.mailing_state].filter(Boolean).join(", ")}
                </span>
              </div>
            )}

            {/* Contact Info */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
              {contact.email && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span className="truncate max-w-[120px]">{contact.email}</span>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{contact.phone}</span>
                </div>
              )}
            </div>

            {/* Office Badge */}
            {contact.office_services && (
              <div className="pt-2">
                <Badge variant="secondary" className="text-xs">
                  {contact.office_services}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
