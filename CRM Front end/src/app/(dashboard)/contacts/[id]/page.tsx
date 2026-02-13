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
import { Pencil, Trash2, User, Phone, MapPin, FileText, Globe, Briefcase, Calendar, Mail, Twitter, Linkedin, Facebook, Shield, Clock, MessageSquare, Link2, Smartphone, CheckCircle, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { ActivityTimeline, CommentsSection } from "@/components/activities";
import { RelatedRecordsPanel } from "@/components/related-records";
import { DocumentsByYear } from "@/components/documents/documents-by-year";
import { QuickActionsMenu } from "@/components/quick-actions";
import { ContactSummaryCard } from "@/components/summary-card";
import { TagSelector } from "@/components/tags";
import { PortalAccessDialog } from "@/components/contacts/portal-access-dialog";
import { ClientMessagesSection } from "@/components/contacts/client-messages-section";
import { getPortalAccounts } from "@/lib/api/settings";
import { Badge } from "@/components/ui/badge";

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

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
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

  useEffect(() => {
    getContact(id).then(setContact).catch(console.error).finally(() => setLoading(false));
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

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-6 lg:w-[720px]">
          <TabsTrigger value="details" className="gap-2">
            <User className="h-4 w-4" />
            Details
          </TabsTrigger>
          <TabsTrigger value="related" className="gap-2">
            <Link2 className="h-4 w-4" />
            Related
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
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
        </TabsList>

        <TabsContent value="details" className="mt-6 space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
            <InfoRow label="Organization" value={contact.corporation?.name} />
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
            {/* Mobile App Access Section */}
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

      {/* Address Section - Full Width */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Mailing Address */}
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

        {/* Other Address */}
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

        <TabsContent value="related" className="mt-6">
          <RelatedRecordsPanel
            entityType="contact"
            entityId={id}
          />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <DocumentsByYear
                entityType="contact"
                entityId={id}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <ActivityTimeline
                entityType="contact"
                entityId={id}
                maxHeight="calc(100vh - 350px)"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <CommentsSection
                entityType="contact"
                entityId={id}
                maxHeight="calc(100vh - 400px)"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="client-messages" className="mt-6">
          <ClientMessagesSection
            contactId={id}
            contactName={contact.full_name || `${contact.first_name} ${contact.last_name}`}
          />
        </TabsContent>
      </Tabs>

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
