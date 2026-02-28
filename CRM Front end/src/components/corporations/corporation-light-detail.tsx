"use client";

import { useState, useEffect } from "react";
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
  ExternalLink,
  User,
  Mail,
  Phone,
  Activity,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  Link2,
  Loader2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ActivityTimeline, CommentsSection } from "@/components/activities";
import api from "@/lib/api";
import type { Corporation, ContactSummary } from "@/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// Related entity types
interface RelatedCase {
  id: string;
  case_number: string;
  case_type: string;
  status: string;
  year: number;
}

interface RelatedAppointment {
  id: string;
  title: string;
  start_datetime: string;
  status: string;
}

interface DocumentYear {
  year: number;
  count: number;
}

// Sidebar Section Component
function SidebarSection({
  title,
  icon,
  count,
  children,
  defaultOpen = false,
  addHref,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
  addHref?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border-b">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              {icon}
              <span className="font-medium text-sm">{title}</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {count}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              {addHref && (
                <Link
                  href={addHref}
                  className="p-1 hover:bg-muted rounded"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Link>
              )}
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-2.5">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function SidebarStatusBadge({ status }: { status: string }) {
  const getVariant = () => {
    const s = status.toLowerCase();
    if (s === "completed" || s === "closed" || s === "sent") return "default";
    if (s === "pending" || s === "scheduled" || s === "draft") return "secondary";
    if (s === "in_progress" || s === "confirmed") return "outline";
    if (s === "cancelled" || s === "rejected") return "destructive";
    return "secondary";
  };

  return (
    <Badge variant={getVariant()} className="text-[10px] px-1.5 h-4">
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

interface CorporationLightDetailProps {
  corporation: Corporation;
}

// Table row for info
function TableRow({ label, value, href }: { label: string; value: string | null | undefined; href?: string }) {
  if (!value) return null;
  return (
    <tr>
      <th className="ps-0 py-2 text-left font-normal text-sm text-gray-600 w-40 align-top">{label}</th>
      <td className="py-2 text-sm text-gray-500">
        {href ? (
          <Link href={href} className="text-blue-600 hover:underline flex items-center gap-1">
            {value}
            <ExternalLink className="h-3 w-3" />
          </Link>
        ) : (
          value
        )}
      </td>
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

export function CorporationLightDetail({ corporation }: CorporationLightDetailProps) {
  const [contacts, setContacts] = useState<ContactSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Related records state
  const [sidebarLoading, setSidebarLoading] = useState(true);
  const [cases, setCases] = useState<RelatedCase[]>([]);
  const [appointments, setAppointments] = useState<RelatedAppointment[]>([]);
  const [documentYears, setDocumentYears] = useState<DocumentYear[]>([]);
  const [totalDocuments, setTotalDocuments] = useState(0);

  const initials = corporation.name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  const billingAddress = [
    corporation.billing_street,
    corporation.billing_city,
    corporation.billing_state,
    corporation.billing_zip,
  ]
    .filter(Boolean)
    .join(", ");

  const shippingAddress = [
    corporation.shipping_street,
    corporation.shipping_city,
    corporation.shipping_state,
    corporation.shipping_zip,
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

  // Fetch contacts linked to this corporation
  useEffect(() => {
    async function fetchContacts() {
      setLoading(true);
      try {
        // If corporation has contacts array, fetch full details
        if (corporation.contacts && corporation.contacts.length > 0) {
          const contactPromises = corporation.contacts.map((contact) =>
            api.get(`/contacts/${contact.id}/`).then((res) => res.data).catch(() => contact)
          );
          const fullContacts = await Promise.all(contactPromises);
          setContacts(fullContacts);
        }
      } catch (error) {
        console.error("Error fetching contacts:", error);
      } finally {
        setLoading(false);
      }
    }

    if (corporation.id) {
      fetchContacts();
    }
  }, [corporation.id, corporation.contacts]);

  const customFields = corporation.custom_fields as Record<string, unknown> | undefined;
  const dotNumber = customFields?.dot_number as string | undefined;

  // Fetch related records (cases, appointments, documents)
  useEffect(() => {
    async function fetchSidebarData() {
      setSidebarLoading(true);
      try {
        const [casesRes, appointmentsRes, documentsRes] = await Promise.allSettled([
          api.get("/cases/", { params: { corporation: corporation.id, page_size: 10 } }),
          api.get("/appointments/", { params: { corporation: corporation.id, page_size: 10 } }),
          api.get("/documents/", { params: { corporation: corporation.id, page_size: 100 } }),
        ]);

        if (casesRes.status === "fulfilled") setCases(casesRes.value.data.results || []);
        if (appointmentsRes.status === "fulfilled") setAppointments(appointmentsRes.value.data.results || []);

        if (documentsRes.status === "fulfilled") {
          const docs = documentsRes.value.data.results || [];
          setTotalDocuments(docs.length);

          // Group documents by year
          const yearCounts: Record<number, number> = {};
          docs.forEach((doc: { created_at: string }) => {
            const year = new Date(doc.created_at).getFullYear();
            yearCounts[year] = (yearCounts[year] || 0) + 1;
          });

          const years = Object.entries(yearCounts)
            .map(([year, count]) => ({ year: parseInt(year), count }))
            .sort((a, b) => b.year - a.year);
          setDocumentYears(years);
        }
      } catch (error) {
        console.error("Error fetching sidebar data:", error);
      } finally {
        setSidebarLoading(false);
      }
    }

    if (corporation.id) fetchSidebarData();
  }, [corporation.id]);

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
                  {corporation.name}
                </h1>
                <div className="flex items-center gap-4 mt-1 text-sm text-white/70">
                  {formatEntityType(corporation.entity_type) && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      {formatEntityType(corporation.entity_type)}
                    </span>
                  )}
                  {corporation.industry && (
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5" />
                      {corporation.industry}
                    </span>
                  )}
                  {billingAddress && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {billingAddress}
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
                  <Link href={`/corporations/${corporation.id}/edit`}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Company
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
          {/* Company Information */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4">
              <h5 className="font-semibold text-gray-800 mb-3">Company Information</h5>
              <table className="w-full">
                <tbody>
                  <TableRow label="Name" value={corporation.name} />
                  <TableRow label="Legal Name" value={corporation.legal_name} />
                  <TableRow label="EIN" value={corporation.ein ? `***-**-${corporation.ein.slice(-4)}` : undefined} />
                  <TableRow label="State ID" value={corporation.state_id} />
                  <TableRow label="Entity Type" value={formatEntityType(corporation.entity_type)} />
                  <TableRow label="Industry" value={corporation.industry} />
                  <TableRow label="Status" value={corporation.status} />
                </tbody>
              </table>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4">
              <h5 className="font-semibold text-gray-800 mb-3">Contact Information</h5>
              <table className="w-full">
                <tbody>
                  <TableRow label="Email" value={corporation.email} />
                  <TableRow label="Phone" value={corporation.phone} />
                  <TableRow label="Fax" value={corporation.fax} />
                  <TableRow label="Website" value={corporation.website} />
                </tbody>
              </table>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4">
              <h5 className="font-semibold text-gray-800 mb-3">Address</h5>
              <table className="w-full">
                <tbody>
                  <TableRow label="Billing Address" value={billingAddress} />
                  <TableRow label="Shipping Address" value={shippingAddress} />
                </tbody>
              </table>
            </div>
          </div>

          {/* Status Badge */}
          {corporation.status && (
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4">
                <h5 className="font-semibold text-gray-800 mb-3">Status</h5>
                <Badge
                  variant="outline"
                  className={cn("text-sm", getStatusBadgeColor(corporation.status))}
                >
                  {corporation.status.toUpperCase()}
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - 75% */}
        <div className="w-3/4">
          {loading ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading contacts...</p>
            </div>
          ) : (
            <>
              {/* Company Details */}
              <div className="bg-white rounded-lg shadow-sm mb-4">
                <div className="p-4">
                  <h5 className="font-semibold text-gray-800 text-lg mb-3">Company Details</h5>
                  <div className="grid grid-cols-3 gap-x-4">
                    <CompanyItem icon={FileText} label="DOT Number" value={dotNumber} />
                    <CompanyItem icon={Hash} label="EIN" value={corporation.ein} />
                    <CompanyItem icon={Hash} label="State ID" value={corporation.state_id} />
                    <CompanyItem icon={Search} label="Entity Type" value={formatEntityType(corporation.entity_type)} />
                    <CompanyItem icon={Calendar} label="Fiscal Year End" value={corporation.fiscal_year_end} />
                    <CompanyItem icon={Briefcase} label="Industry" value={corporation.industry} />
                    <CompanyItem icon={MapPinned} label="Billing Address" value={billingAddress} />
                    <CompanyItem icon={Clock} label="Date Incorporated" value={formatDate(corporation.date_incorporated)} />
                  </div>
                </div>
              </div>

              {/* Linked Contacts */}
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-4">
                  <h5 className="font-semibold text-gray-800 text-lg mb-3">
                    Contacts ({contacts.length})
                  </h5>
                  {contacts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {contacts.map((contact) => {
                        const contactInitials = `${contact.first_name?.[0] || ""}${contact.last_name?.[0] || ""}`
                          .toUpperCase();
                        return (
                          <Link
                            key={contact.id}
                            href={`/contacts/${contact.id}`}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                          >
                            <Avatar className="h-10 w-10 flex-shrink-0">
                              <AvatarFallback className="bg-blue-100 text-blue-600 text-sm font-medium">
                                {contactInitials || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">
                                {contact.full_name || `${contact.first_name} ${contact.last_name}`}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                {contact.email && (
                                  <span className="flex items-center gap-1 truncate">
                                    <Mail className="h-3 w-3" />
                                    {contact.email}
                                  </span>
                                )}
                                {contact.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {contact.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ExternalLink className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-gray-400">
                      <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No contacts linked</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes Section */}
              {corporation.description && (
                <div className="bg-white rounded-lg shadow-sm mt-4">
                  <div className="p-4">
                    <h5 className="font-semibold text-gray-800 text-lg mb-3">Notes</h5>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{corporation.description}</p>
                  </div>
                </div>
              )}

              {/* Activity & Comments Section */}
              <div className="bg-white rounded-lg shadow-sm mt-4">
                <Tabs defaultValue="activity" className="w-full">
                  <div className="border-b px-4 pt-3">
                    <TabsList className="grid w-full grid-cols-2 max-w-[300px]">
                      <TabsTrigger value="activity" className="gap-2">
                        <Activity className="h-4 w-4" />
                        Activity
                      </TabsTrigger>
                      <TabsTrigger value="comments" className="gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Comments
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="activity" className="p-4 mt-0">
                    <ActivityTimeline
                      entityType="corporation"
                      entityId={corporation.id}
                      maxHeight="400px"
                    />
                  </TabsContent>

                  <TabsContent value="comments" className="p-4 mt-0">
                    <CommentsSection
                      entityType="corporation"
                      entityId={corporation.id}
                      maxHeight="400px"
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Related Records Sidebar */}
      <div className="mt-4 bg-white rounded-lg shadow-sm">
        <div className="px-3 py-2.5 border-b bg-muted/30">
          <h3 className="font-semibold text-sm">Related Records</h3>
        </div>

        {sidebarLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Years (Documents by Year) */}
            <SidebarSection
              title="Years"
              icon={<FolderOpen className="h-4 w-4 text-amber-500" />}
              count={totalDocuments}
              defaultOpen={documentYears.length > 0}
              addHref={`/documents?corporation=${corporation.id}`}
            >
              {documentYears.length === 0 ? (
                <p className="text-xs text-muted-foreground">No documents</p>
              ) : (
                <div className="space-y-1">
                  {documentYears.map((year) => (
                    <Link
                      key={year.year}
                      href={`/documents?corporation=${corporation.id}&year=${year.year}`}
                      className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-medium">{year.year}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {year.count}
                      </Badge>
                    </Link>
                  ))}
                  <Link
                    href={`/documents?corporation=${corporation.id}`}
                    className="flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                  >
                    View all documents <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </SidebarSection>

            {/* Cases */}
            <SidebarSection
              title="Cases"
              icon={<Briefcase className="h-4 w-4 text-blue-600" />}
              count={cases.length}
              defaultOpen={cases.length > 0}
              addHref={`/cases/new?corporation=${corporation.id}`}
            >
              {cases.length === 0 ? (
                <p className="text-xs text-muted-foreground">No cases</p>
              ) : (
                <div className="space-y-1.5">
                  {cases.slice(0, 5).map((c) => (
                    <Link
                      key={c.id}
                      href={`/cases/${c.id}`}
                      className="block p-2 rounded border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{c.case_number}</span>
                        <SidebarStatusBadge status={c.status} />
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {c.case_type.replace(/_/g, " ")} &bull; {c.year}
                      </div>
                    </Link>
                  ))}
                  {cases.length > 5 && (
                    <Link
                      href={`/cases?corporation=${corporation.id}`}
                      className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                    >
                      View all ({cases.length}) <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              )}
            </SidebarSection>

            {/* Contacts */}
            <SidebarSection
              title="Contacts"
              icon={<User className="h-4 w-4 text-green-600" />}
              count={contacts.length}
              defaultOpen={contacts.length > 0}
              addHref={`/contacts/new?corporation=${corporation.id}`}
            >
              {contacts.length === 0 ? (
                <p className="text-xs text-muted-foreground">No contacts</p>
              ) : (
                <div className="space-y-1.5">
                  {contacts.slice(0, 5).map((c) => (
                    <Link
                      key={c.id}
                      href={`/contacts/${c.id}`}
                      className="block p-2 rounded border hover:bg-muted/50 transition-colors"
                    >
                      <div className="font-medium text-sm">
                        {c.first_name} {c.last_name}
                      </div>
                      {(c.email || c.phone) && (
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {c.email || c.phone}
                        </div>
                      )}
                    </Link>
                  ))}
                  {contacts.length > 5 && (
                    <Link
                      href={`/contacts?corporation=${corporation.id}`}
                      className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                    >
                      View all ({contacts.length}) <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              )}
            </SidebarSection>

            {/* Appointments */}
            <SidebarSection
              title="Appointments"
              icon={<Calendar className="h-4 w-4 text-indigo-600" />}
              count={appointments.length}
              defaultOpen={appointments.length > 0}
              addHref={`/appointments/new?corporation=${corporation.id}`}
            >
              {appointments.length === 0 ? (
                <p className="text-xs text-muted-foreground">No appointments</p>
              ) : (
                <div className="space-y-1.5">
                  {appointments.slice(0, 5).map((a) => (
                    <Link
                      key={a.id}
                      href={`/appointments/${a.id}`}
                      className="block p-2 rounded border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">{a.title}</span>
                        <SidebarStatusBadge status={a.status} />
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(a.start_datetime), "MMM d, yyyy h:mm a")}
                      </div>
                    </Link>
                  ))}
                  {appointments.length > 5 && (
                    <Link
                      href={`/appointments?corporation=${corporation.id}`}
                      className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                    >
                      View all ({appointments.length}) <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              )}
            </SidebarSection>

            {/* Related Corporations */}
            <SidebarSection
              title="Related Corporations"
              icon={<Link2 className="h-4 w-4 text-purple-600" />}
              count={corporation.related_corporations?.length || 0}
              defaultOpen={(corporation.related_corporations?.length || 0) > 0}
            >
              {!corporation.related_corporations || corporation.related_corporations.length === 0 ? (
                <p className="text-xs text-muted-foreground">No related corporations</p>
              ) : (
                <div className="space-y-1.5">
                  {corporation.related_corporations.slice(0, 5).map((rc) => (
                    <Link
                      key={rc.id}
                      href={`/corporations/${rc.id}`}
                      className="block p-2 rounded border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm truncate">{rc.name}</span>
                      </div>
                    </Link>
                  ))}
                  {corporation.related_corporations.length > 5 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      +{corporation.related_corporations.length - 5} more
                    </p>
                  )}
                </div>
              )}
            </SidebarSection>

            {/* Subsidiaries */}
            <SidebarSection
              title="Subsidiaries"
              icon={<Building2 className="h-4 w-4 text-teal-600" />}
              count={corporation.subsidiaries?.length || 0}
              defaultOpen={(corporation.subsidiaries?.length || 0) > 0}
            >
              {!corporation.subsidiaries || corporation.subsidiaries.length === 0 ? (
                <p className="text-xs text-muted-foreground">No subsidiaries</p>
              ) : (
                <div className="space-y-1.5">
                  {corporation.subsidiaries.slice(0, 5).map((sub) => (
                    <Link
                      key={sub.id}
                      href={`/corporations/${sub.id}`}
                      className="block p-2 rounded border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm truncate">{sub.name}</span>
                      </div>
                    </Link>
                  ))}
                  {corporation.subsidiaries.length > 5 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      +{corporation.subsidiaries.length - 5} more
                    </p>
                  )}
                </div>
              )}
            </SidebarSection>
          </>
        )}
      </div>
    </div>
  );
}
