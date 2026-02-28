"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedBackground } from "@/components/ui/animated-background";
import {
  Pencil,
  MapPin,
  Building2,
  MessageSquare,
  FileText,
  Calendar,
  Hash,
  Search,
  MapPinned,
  Briefcase,
  Clock,
} from "lucide-react";
import type { Contact } from "@/types";

interface ContactLightDetailProps {
  contact: Contact;
}

// Extended types
interface ExtendedCorporation {
  id: string;
  name: string;
  dot_number?: string;
  ein?: string;
  state_id?: string;
  entity_type?: string;
  fiscal_year_end?: string;
  industry?: string;
  billing_street?: string;
  date_incorporated?: string;
}

interface ExtendedContactSummary {
  id: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  email?: string;
  mailing_street?: string;
  ssn_last_four?: string;
}

// Table row for info
function TableRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <tr>
      <th className="ps-0 py-2 text-left font-normal text-sm text-gray-600 w-32 align-top">{label}</th>
      <td className="py-2 text-sm text-gray-500">{value}</td>
    </tr>
  );
}

// Company info item with icon
function CompanyItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex mt-4">
      <div className="flex-shrink-0 self-center mr-3">
        <div className="h-9 w-9 rounded bg-gray-100 flex items-center justify-center shadow-sm">
          <Icon className="h-4 w-4 text-gray-600" />
        </div>
      </div>
      <div className="flex-grow overflow-hidden">
        <p className="mb-1 text-sm text-gray-500 border-b border-gray-100 pb-1">{label}</p>
        <p className="text-sm text-gray-400 mb-0">{value || "-"}</p>
      </div>
    </div>
  );
}

export function ContactLightDetail({ contact }: ContactLightDetailProps) {
  const initials = `${contact.first_name?.[0] || ""}${contact.last_name?.[0] || ""}`
    .toUpperCase();

  const mailingAddress = [
    contact.mailing_street,
    contact.mailing_city,
    contact.mailing_state,
    contact.mailing_zip,
  ]
    .filter(Boolean)
    .join(", ");

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
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

  const customFields = contact.custom_fields as Record<string, unknown> | undefined;
  const relationshipType = customFields?.relationship_type as string | undefined;
  const registeredAgent = customFields?.registered_agent as boolean | undefined;
  const priority = customFields?.priority as string | undefined;

  return (
    <div className="min-h-screen bg-gray-100 -m-6 p-4">
      {/* Header with Animated Background */}
      <div className="overflow-hidden rounded-lg shadow-sm mb-4">
        <AnimatedBackground>
          <div className="p-5">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-white/20">
                <AvatarFallback className="bg-white/10 backdrop-blur-sm text-white text-xl font-semibold">
                  {initials || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-white">
                  {contact.first_name} {contact.last_name}
                </h1>
                <div className="flex items-center gap-4 mt-1 text-sm text-white/70">
                  {mailingAddress && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {mailingAddress}
                    </span>
                  )}
                  {contact.contact_number && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      {contact.contact_number}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-5">
              <Badge variant="outline" className="bg-white/10 text-white border-white/20">
                Overview
              </Badge>
              <div className="flex items-center gap-2">
                <Button asChild size="sm" variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-0">
                  <Link href={`/contacts/${contact.id}/edit`}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Link>
                </Button>
                <Button size="sm" variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-0 px-3">
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </AnimatedBackground>
      </div>

      {/* Main Content - 25% / 75% Layout */}
      <div className="flex gap-4">
        {/* Left Column - 25% */}
        <div className="w-1/4 space-y-4">
          {/* Customer Information */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4">
              <h5 className="font-semibold text-gray-800 mb-3">Customer Information</h5>
              <table className="w-full">
                <tbody>
                  <TableRow label="Name" value={`${contact.first_name} ${contact.last_name}`} />
                  <TableRow label="E-mail" value={contact.email} />
                  <TableRow label="Address" value={mailingAddress} />
                  <TableRow label="Social Security Number" value={contact.ssn_last_four ? `***-**-${contact.ssn_last_four}` : undefined} />
                  <TableRow label="Joined on" value={formatDate(contact.created_at)} />
                </tbody>
              </table>
            </div>
          </div>

          {/* Relationship / Second Owner */}
          {contact.reports_to && (() => {
            const rel = contact.reports_to as ExtendedContactSummary;
            return (
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-4">
                  <h5 className="font-semibold text-gray-800 mb-3">Relationship / Second Owner</h5>
                  <table className="w-full">
                    <tbody>
                      <TableRow label="Name" value={rel.full_name} />
                      <TableRow label="Email" value={rel.email} />
                      <TableRow label="Address" value={rel.mailing_street} />
                      <TableRow label="Social Security Number" value={rel.ssn_last_four ? `***-**-${rel.ssn_last_four}` : undefined} />
                      <TableRow label="Relationship" value={relationshipType} />
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* Other */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4">
              <h5 className="font-semibold text-gray-800 mb-3">Other</h5>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className={registeredAgent
                    ? "border-green-200 bg-green-50 text-green-600"
                    : "border-red-200 bg-red-50 text-red-500"
                  }
                >
                  Registered Agent - {registeredAgent ? "Yes" : "No"}
                </Badge>
                {priority && (
                  <Badge
                    variant="outline"
                    className={
                      priority === "high"
                        ? "border-red-200 bg-red-50 text-red-500"
                        : priority === "low"
                        ? "border-red-200 bg-red-50 text-red-500"
                        : "border-yellow-200 bg-yellow-50 text-yellow-600"
                    }
                  >
                    Priority - {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - 75% */}
        <div className="w-3/4">
          {contact.corporations && contact.corporations.length > 0 ? (
            (contact.corporations as ExtendedCorporation[]).map((corp) => (
              <div key={corp.id} className="bg-white rounded-lg shadow-sm mb-4">
                <div className="p-4">
                  <h5 className="font-semibold text-gray-800 mb-3 text-lg">{corp.name}</h5>
                  <div className="grid grid-cols-3 gap-x-4">
                    <CompanyItem icon={FileText} label="DOT" value={corp.dot_number} />
                    <CompanyItem icon={Hash} label="EIN" value={corp.ein} />
                    <CompanyItem icon={Hash} label="Control Number" value={corp.state_id} />
                    <CompanyItem icon={Search} label="Type of Identity" value={formatEntityType(corp.entity_type)} />
                    <CompanyItem icon={Calendar} label="Start Date" value={formatDate(corp.fiscal_year_end)} />
                    <CompanyItem icon={Briefcase} label="Sector" value={corp.industry} />
                    <CompanyItem icon={MapPinned} label="Address" value={corp.billing_street} />
                    <CompanyItem icon={Clock} label="Date of Formation" value={formatDate(corp.date_incorporated)} />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4">
                <h5 className="font-semibold text-gray-800 mb-3">Company</h5>
                <div className="py-8 text-center text-gray-400">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No companies linked</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
