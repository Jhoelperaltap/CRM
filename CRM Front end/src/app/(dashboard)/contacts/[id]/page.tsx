"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getContact, deleteContact } from "@/lib/api/contacts";
import type { Contact } from "@/types";
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
  User,
  Phone,
  MapPin,
  FileText,
  Globe,
  Briefcase,
  Calendar,
  Mail,
  Twitter,
  Linkedin,
  Facebook,
  Shield,
  Clock,
  MessageSquare,
  Smartphone,
  Loader2,
  Send,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Plus,
  ExternalLink,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ActivityTimeline, CommentsSection } from "@/components/activities";
import { QuickActionsMenu } from "@/components/quick-actions";
import { ContactSummaryCard } from "@/components/summary-card";
import { TagSelector } from "@/components/tags";
import { PortalAccessDialog } from "@/components/contacts/portal-access-dialog";
import { ClientMessagesSection } from "@/components/contacts/client-messages-section";
import { ContactLightDetail } from "@/components/contacts/contact-light-detail";
import { DepartmentFolders } from "@/components/departments";
import { getPortalAccounts } from "@/lib/api/settings";
import { useUIStore } from "@/stores/ui-store";
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

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const uiMode = useUIStore((s) => s.uiMode);
  const [contact, setContact] = useState<Contact | null>(null);
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
  const [appointments, setAppointments] = useState<RelatedAppointment[]>([]);
  const [documentYears, setDocumentYears] = useState<DocumentYear[]>([]);
  const [totalDocuments, setTotalDocuments] = useState(0);

  useEffect(() => {
    getContact(id).then(setContact).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  // Fetch sidebar data
  useEffect(() => {
    async function fetchSidebarData() {
      setSidebarLoading(true);
      try {
        const [casesRes, appointmentsRes, documentsRes] = await Promise.allSettled([
          api.get("/cases/", { params: { contact: id, page_size: 10 } }),
          api.get("/appointments/", { params: { contact: id, page_size: 10 } }),
          api.get("/documents/", { params: { contact: id, page_size: 100 } }),
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

    if (id) fetchSidebarData();
  }, [id]);

  // Check if contact has portal access
  const checkPortalAccess = async () => {
    setPortalLoading(true);
    try {
      const response = await getPortalAccounts({ contact: id });
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
    if (id) {
      checkPortalAccess();
    }
  }, [id]);

  const handleDelete = async () => {
    await deleteContact(id);
    router.push("/contacts");
  };

  if (loading) return <LoadingSpinner />;
  if (!contact) return <div className="p-8 text-center">Contact not found</div>;

  // Light mode: Show simplified detail view
  if (uiMode === "light") {
    return (
      <div className="space-y-6">
        <PageHeader
          title={contact.full_name || `${contact.first_name} ${contact.last_name}`}
          backHref="/contacts"
          actions={
            <>
              <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </>
          }
        />
        <ContactLightDetail contact={contact} />
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete Contact"
          description={`Are you sure you want to delete "${contact.full_name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
        />
      </div>
    );
  }

  const formatOptIn = (value: string) => {
    const labels: Record<string, string> = {
      single_opt_in: "Single Opt-in",
      double_opt_in: "Double Opt-in",
      opt_out: "Opt-out",
    };
    return labels[value] || value || "-";
  };

  const formatLeadSource = (value: string) => {
    const labels: Record<string, string> = {
      cold_call: "Cold Call",
      existing_customer: "Existing Customer",
      self_generated: "Self Generated",
      employee: "Employee",
      partner: "Partner",
      public_relations: "Public Relations",
      direct_mail: "Direct Mail",
      conference: "Conference",
      trade_show: "Trade Show",
      website: "Website",
      word_of_mouth: "Word of Mouth",
      email: "Email",
      campaign: "Campaign",
      other: "Other",
    };
    return labels[value] || value || "-";
  };

  const mailingAddress = [
    contact.mailing_street,
    contact.mailing_city,
    contact.mailing_state,
    contact.mailing_zip,
    contact.mailing_country,
  ].filter(Boolean).join(", ");

  const otherAddress = [
    contact.other_street,
    contact.other_city,
    contact.other_state,
    contact.other_zip,
    contact.other_country,
  ].filter(Boolean).join(", ");

  return (
    <div className="space-y-6">
      <PageHeader
        title={contact.full_name || `${contact.first_name} ${contact.last_name}`}
        description={contact.title ? `${contact.title}${contact.department ? ` - ${contact.department}` : ""}` : undefined}
        backHref="/contacts"
        actions={
          <>
            <QuickActionsMenu
              entityType="contact"
              entityId={id}
              entityName={contact.full_name || `${contact.first_name} ${contact.last_name}`}
              entityEmail={contact.email}
            />
            <Button variant="outline" asChild>
              <Link href={`/contacts/${id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Link>
            </Button>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </>
        }
      />

      <ContactSummaryCard contact={contact} />

      {/* Tags Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <TagSelector contactId={id} />
        </CardContent>
      </Card>

      {/* Main Layout: Activity + Right Sidebar */}
      <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
        {/* Main Content: Activity, Comments, Client Messages, Details */}
        <div className="space-y-6">
          <Tabs defaultValue="activity" className="w-full">
            <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
              <TabsTrigger value="activity" className="gap-2">
                <Clock className="h-4 w-4" />
                Activity
              </TabsTrigger>
              <TabsTrigger value="comments" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Comments
              </TabsTrigger>
              <TabsTrigger value="client-messages" className="gap-2">
                <Send className="h-4 w-4" />
                Client
              </TabsTrigger>
              <TabsTrigger value="details" className="gap-2">
                <User className="h-4 w-4" />
                Details
              </TabsTrigger>
            </TabsList>

            <TabsContent value="activity" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <ActivityTimeline
                    entityType="contact"
                    entityId={id}
                    maxHeight="calc(100vh - 450px)"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="comments" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <CommentsSection
                    entityType="contact"
                    entityId={id}
                    maxHeight="calc(100vh - 500px)"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="client-messages" className="mt-4">
              <ClientMessagesSection
                contactId={id}
                contactName={contact.full_name || `${contact.first_name} ${contact.last_name}`}
              />
            </TabsContent>

            <TabsContent value="details" className="mt-4 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <InfoRow label="Salutation" value={contact.salutation} />
                    <InfoRow label="First Name" value={contact.first_name} />
                    <InfoRow label="Last Name" value={contact.last_name} />
                    <InfoRow label="Title" value={contact.title} />
                    <InfoRow label="Department" value={contact.department} />
                    <InfoRow label="Reports To" value={contact.reports_to ? `${contact.reports_to.first_name} ${contact.reports_to.last_name}` : undefined} />
                    <div className="flex justify-between py-2 border-b border-muted">
                      <span className="text-muted-foreground">Status</span>
                      <StatusBadge status={contact.status} />
                    </div>
                    <InfoRow label="Assigned To" value={contact.assigned_to?.full_name} />
                    <InfoRow label="Primary Corporation" value={contact.primary_corporation?.name} />
                    {contact.corporations && contact.corporations.length > 0 && (
                      <div className="flex justify-between py-2 border-b border-muted">
                        <span className="text-muted-foreground">Corporations</span>
                        <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
                          {contact.corporations.map((corp) => (
                            <Link key={corp.id} href={`/corporations/${corp.id}`}>
                              <Badge variant="outline" className="text-xs hover:bg-primary/10">
                                {corp.name}
                              </Badge>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-blue-600" />
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <InfoRow label="Email" value={contact.email} icon={Mail} />
                    <InfoRow label="Secondary Email" value={contact.secondary_email} />
                    <InfoRow label="Office Phone" value={contact.phone} icon={Phone} />
                    <InfoRow label="Mobile" value={contact.mobile} />
                    <InfoRow label="Home Phone" value={contact.home_phone} />
                    <InfoRow label="Fax" value={contact.fax} />
                    <InfoRow label="Assistant" value={contact.assistant} />
                    <InfoRow label="Assistant Phone" value={contact.assistant_phone} />
                  </CardContent>
                </Card>

                {/* Lead & Source */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-green-600" />
                      Lead & Source
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <InfoRow label="Lead Source" value={formatLeadSource(contact.lead_source)} />
                    <InfoRow label="Source" value={contact.source} />
                    <InfoRow label="Referred By" value={contact.referred_by} />
                    <InfoRow label="Source Campaign" value={contact.source_campaign} />
                    <InfoRow label="Platform" value={contact.platform} />
                    <InfoRow label="Ad Group" value={contact.ad_group} />
                  </CardContent>
                </Card>

                {/* Communication Preferences */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-purple-600" />
                      Communication Preferences
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <InfoRow label="Do Not Call" value={contact.do_not_call ? "Yes" : "No"} />
                    <InfoRow label="Notify Owner" value={contact.notify_owner ? "Yes" : "No"} />
                    <InfoRow label="Email Opt-in" value={formatOptIn(contact.email_opt_in)} />
                    <InfoRow label="SMS Opt-in" value={formatOptIn(contact.sms_opt_in)} />
                    <InfoRow label="Preferred Language" value={contact.preferred_language?.toUpperCase()} />
                    <InfoRow label="Timezone" value={contact.timezone} />
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
                        {portalLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : portalAccess?.hasAccess ? (
                          <Badge variant={portalAccess.isActive ? "default" : "secondary"}>
                            {portalAccess.isActive ? "Active" : "Inactive"}
                          </Badge>
                        ) : (
                          <Badge variant="outline">No Access</Badge>
                        )}
                      </div>

                      {portalAccess?.hasAccess ? (
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>Email: <span className="font-mono">{portalAccess.email}</span></p>
                          {portalAccess.lastLogin && (
                            <p>Last login: {new Date(portalAccess.lastLogin).toLocaleDateString()}</p>
                          )}
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => setPortalDialogOpen(true)}
                          disabled={portalLoading || !contact.email}
                        >
                          <Smartphone className="mr-2 h-4 w-4" />
                          Grant Mobile App Access
                        </Button>
                      )}

                      {!contact.email && !portalAccess?.hasAccess && (
                        <p className="text-xs text-amber-600">
                          Contact needs an email address to grant portal access.
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t">
                      <InfoRow label="Portal User" value={contact.portal_user ? "Yes" : "No"} />
                      <InfoRow label="Support Start Date" value={contact.support_start_date ? new Date(contact.support_start_date).toLocaleDateString() : "-"} />
                      <InfoRow label="Support End Date" value={contact.support_end_date ? new Date(contact.support_end_date).toLocaleDateString() : "-"} />
                      <InfoRow label="SLA" value={contact.sla?.name} />
                    </div>
                  </CardContent>
                </Card>

                {/* Personal Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-red-600" />
                      Personal Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <InfoRow label="Date of Birth" value={contact.date_of_birth ? new Date(contact.date_of_birth).toLocaleDateString() : "-"} />
                    <InfoRow label="SSN Last 4" value={contact.ssn_last_four ? `****${contact.ssn_last_four}` : "-"} />
                  </CardContent>
                </Card>
              </div>

              {/* Address Section */}
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-red-600" />
                      Mailing Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    {mailingAddress ? (
                      <div className="space-y-1">
                        {contact.mailing_street && <p>{contact.mailing_street}</p>}
                        {contact.mailing_po_box && <p>PO Box: {contact.mailing_po_box}</p>}
                        <p>
                          {[contact.mailing_city, contact.mailing_state, contact.mailing_zip].filter(Boolean).join(", ")}
                        </p>
                        {contact.mailing_country && <p>{contact.mailing_country}</p>}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No mailing address provided</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-green-600" />
                      Other Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    {otherAddress ? (
                      <div className="space-y-1">
                        {contact.other_street && <p>{contact.other_street}</p>}
                        {contact.other_po_box && <p>PO Box: {contact.other_po_box}</p>}
                        <p>
                          {[contact.other_city, contact.other_state, contact.other_zip].filter(Boolean).join(", ")}
                        </p>
                        {contact.other_country && <p>{contact.other_country}</p>}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No other address provided</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Social Media */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-sky-500" />
                    Social Media
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm grid gap-4 md:grid-cols-3">
                  <div>
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Twitter className="h-4 w-4" /> Twitter
                    </div>
                    <p className="font-medium">{contact.twitter_username ? `@${contact.twitter_username}` : "-"}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Linkedin className="h-4 w-4" /> LinkedIn
                    </div>
                    <p className="font-medium truncate">{contact.linkedin_url || "-"}</p>
                    {contact.linkedin_followers && (
                      <p className="text-xs text-muted-foreground">{contact.linkedin_followers.toLocaleString()} followers</p>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Facebook className="h-4 w-4" /> Facebook
                    </div>
                    <p className="font-medium truncate">{contact.facebook_url || "-"}</p>
                    {contact.facebook_followers && (
                      <p className="text-xs text-muted-foreground">{contact.facebook_followers.toLocaleString()} followers</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Description */}
              {contact.description && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-gray-600" />
                      Description
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{contact.description}</p>
                  </CardContent>
                </Card>
              )}

              {/* Record Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Record Information</CardTitle>
                </CardHeader>
                <CardContent className="text-sm grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground">Created By</p>
                    <p className="font-medium">{contact.created_by?.full_name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Created At</p>
                    <p className="font-medium">{new Date(contact.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Modified</p>
                    <p className="font-medium">{new Date(contact.updated_at).toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>
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
              {/* Corporations */}
              {contact.corporations && contact.corporations.length > 0 && (
                <SidebarSection
                  title="Corporations"
                  icon={<Building2 className="h-4 w-4 text-slate-500" />}
                  count={contact.corporations.length}
                  defaultOpen={true}
                >
                  <div className="space-y-1.5">
                    {contact.corporations.map((corp) => (
                      <Link
                        key={corp.id}
                        href={`/corporations/${corp.id}`}
                        className="block p-2 rounded border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{corp.name}</span>
                          {contact.primary_corporation?.id === corp.id && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 h-4">
                              Primary
                            </Badge>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </SidebarSection>
              )}

              {/* Years (Documents by Year) */}
              <SidebarSection
                title="Years"
                icon={<FolderOpen className="h-4 w-4 text-amber-500" />}
                count={totalDocuments}
                defaultOpen={documentYears.length > 0}
                addHref={`/documents?contact=${id}`}
              >
                {documentYears.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No documents</p>
                ) : (
                  <div className="space-y-1">
                    {documentYears.map((year) => (
                      <Link
                        key={year.year}
                        href={`/documents?contact=${id}&year=${year.year}`}
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
                      href={`/documents?contact=${id}`}
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
                addHref={`/cases/new?contact=${id}`}
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
                        href={`/cases?contact=${id}`}
                        className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                      >
                        View all ({cases.length}) <ExternalLink className="h-3 w-3" />
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
                addHref={`/appointments/new?contact=${id}`}
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
                        href={`/appointments?contact=${id}`}
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
        <DepartmentFolders contactId={id} />
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Contact"
        description={`Are you sure you want to delete "${contact.full_name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />

      <PortalAccessDialog
        open={portalDialogOpen}
        onOpenChange={setPortalDialogOpen}
        contactId={id}
        contactName={contact.full_name || `${contact.first_name} ${contact.last_name}`}
        contactEmail={contact.email}
        onSuccess={checkPortalAccess}
      />
    </div>
  );
}
