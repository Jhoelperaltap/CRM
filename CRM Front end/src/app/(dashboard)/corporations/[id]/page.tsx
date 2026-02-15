"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCorporation, deleteCorporation } from "@/lib/api/corporations";
import type { Corporation } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Pencil,
  Trash2,
  Building2,
  Phone,
  MapPin,
  FileText,
  Globe,
  Users,
  DollarSign,
  Calendar,
  Mail,
  Twitter,
  Linkedin,
  Facebook,
  Clock,
  MessageSquare,
  Link2,
  Shield,
  Smartphone,
  CheckCircle,
  Loader2,
  Briefcase,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Plus,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ActivityTimeline, CommentsSection } from "@/components/activities";
import { QuickActionsMenu } from "@/components/quick-actions";
import { CorporationSummaryCard } from "@/components/summary-card";
import { PortalAccessDialog } from "@/components/contacts/portal-access-dialog";
import { DepartmentFolders } from "@/components/departments";
import { getPortalAccounts } from "@/lib/api/settings";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

// Related entity types for sidebar
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

interface RelatedContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
}

interface DocumentYear {
  year: number;
  count: number;
}

function InfoRow({ label, value, icon: Icon }: { label: string; value: string | number | null | undefined; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex justify-between py-2 border-b border-muted last:border-0">
      <span className="text-muted-foreground flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </span>
      <span className="font-medium text-right max-w-[60%] truncate">{value || "-"}</span>
    </div>
  );
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

export default function CorporationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [corp, setCorp] = useState<Corporation | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [portalDialogOpen, setPortalDialogOpen] = useState(false);
  const [portalAccess, setPortalAccess] = useState<{
    hasAccess: boolean;
    isActive: boolean;
    email: string;
    lastLogin: string | null;
  } | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // Sidebar data
  const [sidebarLoading, setSidebarLoading] = useState(true);
  const [cases, setCases] = useState<RelatedCase[]>([]);
  const [contacts, setContacts] = useState<RelatedContact[]>([]);
  const [appointments, setAppointments] = useState<RelatedAppointment[]>([]);
  const [documentYears, setDocumentYears] = useState<DocumentYear[]>([]);
  const [totalDocuments, setTotalDocuments] = useState(0);

  useEffect(() => {
    getCorporation(id)
      .then(setCorp)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  // Fetch sidebar data
  useEffect(() => {
    async function fetchSidebarData() {
      setSidebarLoading(true);
      try {
        const [casesRes, contactsRes, appointmentsRes, documentsRes] = await Promise.allSettled([
          api.get("/cases/", { params: { corporation: id, page_size: 10 } }),
          api.get("/contacts/", { params: { corporation: id, page_size: 10 } }),
          api.get("/appointments/", { params: { corporation: id, page_size: 10 } }),
          api.get("/documents/", { params: { corporation: id, page_size: 100 } }),
        ]);

        if (casesRes.status === "fulfilled") setCases(casesRes.value.data.results || []);
        if (contactsRes.status === "fulfilled") setContacts(contactsRes.value.data.results || []);
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

    if (id) fetchSidebarData();
  }, [id]);

  // Check portal access for primary contact
  const checkPortalAccess = async (contactId: string) => {
    setPortalLoading(true);
    try {
      const response = await getPortalAccounts({ contact: contactId });
      const access = response.results[0];
      if (access) {
        setPortalAccess({
          hasAccess: true,
          isActive: access.is_active,
          email: access.email,
          lastLogin: access.last_login,
        });
      } else {
        setPortalAccess({ hasAccess: false, isActive: false, email: "", lastLogin: null });
      }
    } catch {
      setPortalAccess({ hasAccess: false, isActive: false, email: "", lastLogin: null });
    } finally {
      setPortalLoading(false);
    }
  };

  useEffect(() => {
    if (corp?.primary_contact?.id) {
      checkPortalAccess(corp.primary_contact.id);
    }
  }, [corp?.primary_contact?.id]);

  if (loading) return <LoadingSpinner />;
  if (!corp) return <div className="p-8 text-center">Corporation not found</div>;

  const formatRevenue = (revenue: number | null) => {
    if (!revenue) return "-";
    return `$${Number(revenue).toLocaleString()}`;
  };

  const formatRevenueRange = (range: string) => {
    const labels: Record<string, string> = {
      under_100k: "Under $100,000",
      "100k_500k": "$100,000 - $500,000",
      "500k_1m": "$500,000 - $1,000,000",
      "1m_5m": "$1,000,000 - $5,000,000",
      "5m_10m": "$5,000,000 - $10,000,000",
      "10m_25m": "$10,000,000 - $25,000,000",
      "25m_50m": "$25,000,000 - $50,000,000",
      "50m_100m": "$50,000,000 - $100,000,000",
      over_100m: "Over $100,000,000",
    };
    return labels[range] || range || "-";
  };

  const formatEntityType = (type: string) => {
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

  const billingAddress = [
    corp.billing_street,
    corp.billing_city,
    corp.billing_state,
    corp.billing_zip,
    corp.billing_country,
  ].filter(Boolean).join(", ");

  const shippingAddress = [
    corp.shipping_street,
    corp.shipping_city,
    corp.shipping_state,
    corp.shipping_zip,
    corp.shipping_country,
  ].filter(Boolean).join(", ");

  return (
    <div className="space-y-6">
      <PageHeader
        title={corp.name}
        description={corp.legal_name || undefined}
        backHref="/corporations"
        actions={
          <>
            <QuickActionsMenu
              entityType="corporation"
              entityId={id}
              entityName={corp.name}
              entityEmail={corp.email}
            />
            <Button variant="outline" asChild>
              <Link href={`/corporations/${id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Link>
            </Button>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </>
        }
      />

      <CorporationSummaryCard corporation={corp} />

      {/* Main Layout: Activity + Right Sidebar */}
      <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
        {/* Main Content: Activity & Comments */}
        <div className="space-y-6">
          <Tabs defaultValue="activity" className="w-full">
            <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
              <TabsTrigger value="activity" className="gap-2">
                <Clock className="h-4 w-4" />
                Activity
              </TabsTrigger>
              <TabsTrigger value="comments" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Comments
              </TabsTrigger>
              <TabsTrigger value="details" className="gap-2">
                <Building2 className="h-4 w-4" />
                Details
              </TabsTrigger>
            </TabsList>

            <TabsContent value="activity" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <ActivityTimeline
                    entityType="corporation"
                    entityId={id}
                    maxHeight="calc(100vh - 400px)"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="comments" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <CommentsSection
                    entityType="corporation"
                    entityId={id}
                    maxHeight="calc(100vh - 450px)"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details" className="mt-4 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Organization Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Organization Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <InfoRow label="Account Number" value={corp.account_number} />
                    <InfoRow label="Entity Type" value={formatEntityType(corp.entity_type)} />
                    <InfoRow label="Organization Type" value={corp.organization_type ? corp.organization_type.charAt(0).toUpperCase() + corp.organization_type.slice(1) : "-"} />
                    <InfoRow label="Organization Status" value={corp.organization_status ? corp.organization_status.charAt(0).toUpperCase() + corp.organization_status.slice(1) : "-"} />
                    <InfoRow label="EIN" value={corp.ein} />
                    <InfoRow label="State ID" value={corp.state_id} />
                    <div className="flex justify-between py-2 border-b border-muted">
                      <span className="text-muted-foreground">Status</span>
                      <StatusBadge status={corp.status} />
                    </div>
                    <InfoRow label="Assigned To" value={corp.assigned_to?.full_name} />
                    <InfoRow label="Member Of" value={corp.member_of?.name} />
                  </CardContent>
                </Card>

                {/* Business Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      Business Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <InfoRow label="Industry" value={corp.industry} icon={Globe} />
                    <InfoRow label="Employees" value={corp.employees} icon={Users} />
                    <InfoRow label="Ownership" value={corp.ownership} />
                    <InfoRow label="Annual Revenue" value={formatRevenue(corp.annual_revenue)} />
                    <InfoRow label="Revenue Range" value={formatRevenueRange(corp.annual_revenue_range)} />
                    <InfoRow label="Ticker Symbol" value={corp.ticker_symbol} />
                    <InfoRow label="SIC Code" value={corp.sic_code} />
                    <InfoRow label="Region" value={corp.region ? corp.region.charAt(0).toUpperCase() + corp.region.slice(1) : "-"} />
                    <InfoRow label="Timezone" value={corp.timezone} />
                  </CardContent>
                </Card>

                {/* Contact Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-blue-600" />
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <InfoRow label="Phone" value={corp.phone} icon={Phone} />
                    <InfoRow label="Secondary Phone" value={corp.secondary_phone} />
                    <InfoRow label="Fax" value={corp.fax} />
                    <InfoRow label="Email" value={corp.email} icon={Mail} />
                    <InfoRow label="Secondary Email" value={corp.secondary_email} />
                    <InfoRow label="Email Domain" value={corp.email_domain} />
                    <InfoRow label="Website" value={corp.website} icon={Globe} />
                  </CardContent>
                </Card>

                {/* Social Media */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Twitter className="h-5 w-5 text-sky-500" />
                      Social Media
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <InfoRow label="Twitter" value={corp.twitter_username} icon={Twitter} />
                    <InfoRow label="LinkedIn" value={corp.linkedin_url} icon={Linkedin} />
                    <InfoRow label="Facebook" value={corp.facebook_url} icon={Facebook} />
                  </CardContent>
                </Card>

                {/* Marketing Preferences */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-purple-600" />
                      Marketing Preferences
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <InfoRow label="Email Opt-in" value={corp.email_opt_in?.replace(/_/g, " ")} />
                    <InfoRow label="SMS Opt-in" value={corp.sms_opt_in?.replace(/_/g, " ")} />
                    <InfoRow label="Notify Owner" value={corp.notify_owner ? "Yes" : "No"} />
                  </CardContent>
                </Card>

                {/* Customer Portal */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-orange-600" />
                      Customer Portal
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-4">
                    <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Mobile App Access</span>
                        </div>
                        {!corp.primary_contact ? (
                          <Badge variant="outline">No Primary Contact</Badge>
                        ) : portalLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : portalAccess?.hasAccess ? (
                          <Badge variant={portalAccess.isActive ? "default" : "secondary"}>
                            {portalAccess.isActive ? "Active" : "Inactive"}
                          </Badge>
                        ) : (
                          <Badge variant="outline">No Access</Badge>
                        )}
                      </div>

                      {!corp.primary_contact ? (
                        <p className="text-xs text-muted-foreground">
                          Set a primary contact to grant portal access for this corporation.
                        </p>
                      ) : portalAccess?.hasAccess ? (
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>Contact: <Link href={`/contacts/${corp.primary_contact.id}`} className="underline">{corp.primary_contact.first_name} {corp.primary_contact.last_name}</Link></p>
                          <p>Email: <span className="font-mono">{portalAccess.email}</span></p>
                          {portalAccess.lastLogin && (
                            <p>Last login: {new Date(portalAccess.lastLogin).toLocaleDateString()}</p>
                          )}
                        </div>
                      ) : (
                        <>
                          <p className="text-xs text-muted-foreground">
                            Grant portal access to: <Link href={`/contacts/${corp.primary_contact.id}`} className="underline">{corp.primary_contact.first_name} {corp.primary_contact.last_name}</Link>
                          </p>
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => setPortalDialogOpen(true)}
                            disabled={portalLoading}
                          >
                            <Smartphone className="mr-2 h-4 w-4" />
                            Grant Mobile App Access
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Dates */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-orange-600" />
                      Important Dates
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <InfoRow label="Date Incorporated" value={corp.date_incorporated ? new Date(corp.date_incorporated).toLocaleDateString() : "-"} />
                    <InfoRow label="Fiscal Year End" value={corp.fiscal_year_end} />
                    <InfoRow label="Created At" value={new Date(corp.created_at).toLocaleDateString()} />
                    <InfoRow label="Updated At" value={new Date(corp.updated_at).toLocaleDateString()} />
                  </CardContent>
                </Card>

                {/* Record Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Record Information</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <div className="space-y-2">
                      <div>
                        <p className="text-muted-foreground">Created By</p>
                        <p className="font-medium">{corp.created_by?.full_name || "-"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last Modified</p>
                        <p className="font-medium">{new Date(corp.updated_at).toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Address Section - Full Width */}
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-red-600" />
                      Billing Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    {billingAddress ? (
                      <div className="space-y-1">
                        {corp.billing_street && <p>{corp.billing_street}</p>}
                        {corp.billing_po_box && <p>PO Box: {corp.billing_po_box}</p>}
                        <p>
                          {[corp.billing_city, corp.billing_state, corp.billing_zip].filter(Boolean).join(", ")}
                        </p>
                        {corp.billing_country && <p>{corp.billing_country}</p>}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No billing address provided</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-green-600" />
                      Shipping Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    {shippingAddress ? (
                      <div className="space-y-1">
                        {corp.shipping_street && <p>{corp.shipping_street}</p>}
                        {corp.shipping_po_box && <p>PO Box: {corp.shipping_po_box}</p>}
                        <p>
                          {[corp.shipping_city, corp.shipping_state, corp.shipping_zip].filter(Boolean).join(", ")}
                        </p>
                        {corp.shipping_country && <p>{corp.shipping_country}</p>}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No shipping address provided</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Description */}
              {corp.description && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-gray-600" />
                      Description
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{corp.description}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-0 border rounded-lg bg-card h-fit lg:sticky lg:top-6">
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
                addHref={`/documents?corporation=${id}`}
              >
                {documentYears.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No documents</p>
                ) : (
                  <div className="space-y-1">
                    {documentYears.map((year) => (
                      <Link
                        key={year.year}
                        href={`/documents?corporation=${id}&year=${year.year}`}
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
                      href={`/documents?corporation=${id}`}
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
                addHref={`/cases/new?corporation=${id}`}
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
                        href={`/cases?corporation=${id}`}
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
                icon={<Users className="h-4 w-4 text-green-600" />}
                count={contacts.length}
                defaultOpen={contacts.length > 0}
                addHref={`/contacts/new?corporation=${id}`}
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
                        href={`/contacts?corporation=${id}`}
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
                addHref={`/appointments/new?corporation=${id}`}
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
                        href={`/appointments?corporation=${id}`}
                        className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                      >
                        View all ({appointments.length}) <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                )}
              </SidebarSection>
            </>
          )}
        </div>

        {/* Department Folders */}
        <DepartmentFolders corporationId={id} />
      </div>

      {/* Portal Access Dialog */}
      {corp.primary_contact && (
        <PortalAccessDialog
          open={portalDialogOpen}
          onOpenChange={setPortalDialogOpen}
          contactId={corp.primary_contact.id}
          contactName={`${corp.primary_contact.first_name} ${corp.primary_contact.last_name}`}
          contactEmail={corp.primary_contact.email || corp.email || null}
          onSuccess={() => {
            if (corp.primary_contact?.id) {
              checkPortalAccess(corp.primary_contact.id);
            }
          }}
        />
      )}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Corporation"
        description={`Are you sure you want to delete "${corp.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          await deleteCorporation(id);
          router.push("/corporations");
        }}
      />
    </div>
  );
}
