"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedBackground } from "@/components/ui/animated-background";
import {
  Pencil,
  FileText,
  MessageSquare,
  Calendar,
  DollarSign,
  User,
  Building2,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  Loader2,
  Briefcase,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ActivityTimeline, CommentsSection } from "@/components/activities";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import api from "@/lib/api";
import type { TaxCase, TaxCaseNote } from "@/types";

// Related entity types
interface RelatedCase {
  id: string;
  case_number: string;
  case_type: string;
  status: string;
  fiscal_year: number;
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
    if (s === "completed" || s === "closed" || s === "filed") return "default";
    if (s === "pending" || s === "scheduled" || s === "new") return "secondary";
    if (s === "in_progress" || s === "confirmed") return "outline";
    if (s === "cancelled" || s === "rejected" || s === "on_hold") return "destructive";
    return "secondary";
  };

  return (
    <Badge variant={getVariant()} className="text-[10px] px-1.5 h-4">
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

interface CaseLightDetailProps {
  case_: TaxCase;
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

// Info item with icon
function InfoItem({
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

export function CaseLightDetail({ case_ }: CaseLightDetailProps) {
  const [notes, setNotes] = useState<TaxCaseNote[]>(case_.notes || []);

  // Related records state
  const [sidebarLoading, setSidebarLoading] = useState(true);
  const [relatedCases, setRelatedCases] = useState<RelatedCase[]>([]);
  const [appointments, setAppointments] = useState<RelatedAppointment[]>([]);
  const [documentYears, setDocumentYears] = useState<DocumentYear[]>([]);
  const [totalDocuments, setTotalDocuments] = useState(0);

  // Fetch related records
  useEffect(() => {
    async function fetchSidebarData() {
      setSidebarLoading(true);
      try {
        const contactId = case_.contact?.id;
        const corporationId = case_.corporation?.id;

        const [casesRes, appointmentsRes, documentsRes] = await Promise.allSettled([
          // Get related cases (same contact or corporation, excluding current case)
          contactId
            ? api.get("/cases/", { params: { contact: contactId, page_size: 20 } })
            : corporationId
            ? api.get("/cases/", { params: { corporation: corporationId, page_size: 20 } })
            : Promise.resolve({ data: { results: [] } }),
          // Get appointments related to this case
          api.get("/appointments/", { params: { case: case_.id, page_size: 10 } }),
          // Get documents related to this case
          api.get("/documents/", { params: { case: case_.id, page_size: 100 } }),
        ]);

        if (casesRes.status === "fulfilled") {
          // Filter out the current case
          const cases = (casesRes.value.data.results || []).filter(
            (c: RelatedCase) => c.id !== case_.id
          );
          setRelatedCases(cases);
        }

        if (appointmentsRes.status === "fulfilled") {
          setAppointments(appointmentsRes.value.data.results || []);
        }

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

    if (case_.id) fetchSidebarData();
  }, [case_.id, case_.contact?.id, case_.corporation?.id]);

  const initials = case_.title
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

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

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return null;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatCaseType = (type?: string) => {
    if (!type) return null;
    const labels: Record<string, string> = {
      individual_1040: "Individual 1040",
      business_1120: "Business 1120",
      business_1120s: "Business 1120-S",
      partnership_1065: "Partnership 1065",
      estate_1041: "Estate 1041",
      trust_1041: "Trust 1041",
      exempt_org_990: "Exempt Org 990",
      payroll_941: "Payroll 941",
      sales_tax: "Sales Tax",
      other: "Other",
    };
    return labels[type] || type;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "new":
        return "border-blue-200 bg-blue-50 text-blue-700";
      case "in_progress":
        return "border-yellow-200 bg-yellow-50 text-yellow-700";
      case "pending_review":
        return "border-purple-200 bg-purple-50 text-purple-700";
      case "pending_client":
        return "border-orange-200 bg-orange-50 text-orange-700";
      case "ready_to_file":
        return "border-cyan-200 bg-cyan-50 text-cyan-700";
      case "filed":
        return "border-green-200 bg-green-50 text-green-700";
      case "closed":
        return "border-gray-200 bg-gray-50 text-gray-600";
      case "on_hold":
        return "border-red-200 bg-red-50 text-red-600";
      default:
        return "border-gray-200 bg-gray-50 text-gray-600";
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "border-red-200 bg-red-50 text-red-700";
      case "high":
        return "border-orange-200 bg-orange-50 text-orange-700";
      case "normal":
        return "border-blue-200 bg-blue-50 text-blue-700";
      case "low":
        return "border-gray-200 bg-gray-50 text-gray-600";
      default:
        return "border-gray-200 bg-gray-50 text-gray-600";
    }
  };

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
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-white">
                    {case_.case_number}
                  </h1>
                  <Badge
                    variant="outline"
                    className={cn(
                      "bg-white/10 text-white border-white/20",
                      getStatusBadgeColor(case_.status)
                    )}
                  >
                    {case_.status.replace(/_/g, " ").toUpperCase()}
                  </Badge>
                </div>
                <p className="text-lg text-white/90 mt-1">{case_.title}</p>
                <div className="flex items-center gap-4 mt-1 text-sm text-white/70">
                  {formatCaseType(case_.case_type) && (
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      {formatCaseType(case_.case_type)}
                    </span>
                  )}
                  {case_.fiscal_year && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      FY {case_.fiscal_year}
                    </span>
                  )}
                  {case_.priority && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "bg-white/10 text-white border-white/20",
                        getPriorityBadgeColor(case_.priority)
                      )}
                    >
                      {case_.priority.toUpperCase()}
                    </Badge>
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
                  <Link href={`/cases/${case_.id}/edit`}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Case
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
          {/* Case Information */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4">
              <h5 className="font-semibold text-gray-800 mb-3">Case Information</h5>
              <table className="w-full">
                <tbody>
                  <TableRow label="Case Number" value={case_.case_number} />
                  <TableRow label="Title" value={case_.title} />
                  <TableRow label="Case Type" value={formatCaseType(case_.case_type)} />
                  <TableRow label="Fiscal Year" value={case_.fiscal_year?.toString()} />
                  <TableRow label="Status" value={case_.status.replace(/_/g, " ")} />
                  <TableRow label="Priority" value={case_.priority} />
                </tbody>
              </table>
            </div>
          </div>

          {/* Key Dates */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4">
              <h5 className="font-semibold text-gray-800 mb-3">Key Dates</h5>
              <table className="w-full">
                <tbody>
                  <TableRow label="Due Date" value={formatDate(case_.due_date)} />
                  <TableRow label="Extension Date" value={formatDate(case_.extension_date)} />
                  <TableRow label="Filed Date" value={formatDate(case_.filed_date)} />
                  <TableRow label="Completed Date" value={formatDate(case_.completed_date)} />
                  <TableRow label="Closed Date" value={formatDate(case_.closed_date)} />
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Information */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4">
              <h5 className="font-semibold text-gray-800 mb-3">Financial Information</h5>
              <table className="w-full">
                <tbody>
                  <TableRow label="Estimated Fee" value={formatCurrency(case_.estimated_fee)} />
                  <TableRow label="Actual Fee" value={formatCurrency(case_.actual_fee)} />
                </tbody>
              </table>
            </div>
          </div>

          {/* Lock Status */}
          {case_.is_locked && (
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4">
                <div className="flex items-center gap-2 text-yellow-600">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-semibold">Case Locked</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - 75% */}
        <div className="w-3/4 space-y-4">
          {/* Client Information */}
          {case_.contact && (
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4">
                <h5 className="font-semibold text-gray-800 text-lg mb-3">Client Information</h5>
                <Link
                  href={`/contacts/${case_.contact.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                >
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-sm font-medium">
                      {`${case_.contact.first_name?.[0] || ""}${case_.contact.last_name?.[0] || ""}`.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">
                      {case_.contact.full_name || `${case_.contact.first_name} ${case_.contact.last_name}`}
                    </p>
                    {case_.contact.email && (
                      <p className="text-xs text-gray-500 truncate">{case_.contact.email}</p>
                    )}
                    {case_.contact.phone && (
                      <p className="text-xs text-gray-500">{case_.contact.phone}</p>
                    )}
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </Link>
              </div>
            </div>
          )}

          {/* Corporation Information */}
          {case_.corporation && (
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4">
                <h5 className="font-semibold text-gray-800 text-lg mb-3">Corporation Information</h5>
                <Link
                  href={`/corporations/${case_.corporation.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                >
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarFallback className="bg-purple-100 text-purple-600 text-sm font-medium">
                      {case_.corporation.name
                        .split(" ")
                        .slice(0, 2)
                        .map((word) => word[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{case_.corporation.name}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </Link>
              </div>
            </div>
          )}

          {/* Case Details */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4">
              <h5 className="font-semibold text-gray-800 text-lg mb-3">Case Details</h5>
              <div className="grid grid-cols-3 gap-x-4">
                <InfoItem icon={FileText} label="Case Type" value={formatCaseType(case_.case_type)} />
                <InfoItem icon={Calendar} label="Fiscal Year" value={case_.fiscal_year?.toString()} />
                <InfoItem icon={Clock} label="Status" value={case_.status.replace(/_/g, " ")} />
                <InfoItem icon={DollarSign} label="Estimated Fee" value={formatCurrency(case_.estimated_fee)} />
                <InfoItem icon={DollarSign} label="Actual Fee" value={formatCurrency(case_.actual_fee)} />
                <InfoItem icon={Calendar} label="Due Date" value={formatDate(case_.due_date)} />
                {case_.assigned_preparer && (
                  <InfoItem
                    icon={User}
                    label="Assigned Preparer"
                    value={case_.assigned_preparer.full_name}
                  />
                )}
                {case_.reviewer && (
                  <InfoItem icon={User} label="Reviewer" value={case_.reviewer.full_name} />
                )}
                {case_.created_by && (
                  <InfoItem icon={User} label="Created By" value={case_.created_by.full_name} />
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {case_.description && (
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4">
                <h5 className="font-semibold text-gray-800 text-lg mb-3">Description</h5>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{case_.description}</p>
              </div>
            </div>
          )}

          {/* Notes Section */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4">
              <h5 className="font-semibold text-gray-800 text-lg mb-3">
                Notes ({notes.length})
              </h5>
              {notes.length > 0 ? (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 rounded-lg border border-gray-100 bg-gray-50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                              {note.author.full_name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-gray-800">
                              {note.author.full_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(note.created_at)}
                            </p>
                          </div>
                        </div>
                        {note.is_internal && (
                          <Badge variant="outline" className="text-xs">
                            Internal
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{note.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-400">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No notes added</p>
                </div>
              )}
            </div>
          </div>

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
                  entityType="case"
                  entityId={case_.id}
                  maxHeight="400px"
                />
              </TabsContent>

              <TabsContent value="comments" className="p-4 mt-0">
                <CommentsSection
                  entityType="case"
                  entityId={case_.id}
                  maxHeight="400px"
                />
              </TabsContent>
            </Tabs>
          </div>
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
              title="Documents"
              icon={<FolderOpen className="h-4 w-4 text-amber-500" />}
              count={totalDocuments}
              defaultOpen={documentYears.length > 0}
              addHref={`/documents?case=${case_.id}`}
            >
              {documentYears.length === 0 ? (
                <p className="text-xs text-muted-foreground">No documents</p>
              ) : (
                <div className="space-y-1">
                  {documentYears.map((year) => (
                    <Link
                      key={year.year}
                      href={`/documents?case=${case_.id}&year=${year.year}`}
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
                    href={`/documents?case=${case_.id}`}
                    className="flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                  >
                    View all documents <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </SidebarSection>

            {/* Appointments */}
            <SidebarSection
              title="Appointments"
              icon={<Calendar className="h-4 w-4 text-indigo-600" />}
              count={appointments.length}
              defaultOpen={appointments.length > 0}
              addHref={`/appointments/new?case=${case_.id}`}
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
                      href={`/appointments?case=${case_.id}`}
                      className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                    >
                      View all ({appointments.length}) <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              )}
            </SidebarSection>

            {/* Client (Contact) */}
            {case_.contact && (
              <SidebarSection
                title="Client"
                icon={<User className="h-4 w-4 text-green-600" />}
                count={1}
                defaultOpen={true}
              >
                <Link
                  href={`/contacts/${case_.contact.id}`}
                  className="block p-2 rounded border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                        {`${case_.contact.first_name?.[0] || ""}${case_.contact.last_name?.[0] || ""}`.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {case_.contact.full_name || `${case_.contact.first_name} ${case_.contact.last_name}`}
                      </p>
                      {case_.contact.email && (
                        <p className="text-xs text-muted-foreground truncate">{case_.contact.email}</p>
                      )}
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  </div>
                </Link>
              </SidebarSection>
            )}

            {/* Corporation */}
            {case_.corporation && (
              <SidebarSection
                title="Corporation"
                icon={<Building2 className="h-4 w-4 text-slate-600" />}
                count={1}
                defaultOpen={true}
              >
                <Link
                  href={`/corporations/${case_.corporation.id}`}
                  className="block p-2 rounded border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-purple-100 text-purple-600 text-xs">
                        {case_.corporation.name
                          .split(" ")
                          .slice(0, 2)
                          .map((word) => word[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{case_.corporation.name}</p>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  </div>
                </Link>
              </SidebarSection>
            )}

            {/* Related Cases */}
            {relatedCases.length > 0 && (
              <SidebarSection
                title="Related Cases"
                icon={<Briefcase className="h-4 w-4 text-blue-600" />}
                count={relatedCases.length}
                defaultOpen={true}
              >
                <div className="space-y-1.5">
                  {relatedCases.slice(0, 5).map((c) => (
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
                        {c.case_type.replace(/_/g, " ")} &bull; FY {c.fiscal_year}
                      </div>
                    </Link>
                  ))}
                  {relatedCases.length > 5 && (
                    <Link
                      href={`/cases?contact=${case_.contact?.id || ""}`}
                      className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                    >
                      View all ({relatedCases.length}) <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </SidebarSection>
            )}
          </>
        )}
      </div>
    </div>
  );
}
