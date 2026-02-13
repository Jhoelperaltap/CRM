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
import { Pencil, Trash2, Building2, Phone, MapPin, FileText, Globe, Users, DollarSign, Calendar, Mail, Twitter, Linkedin, Facebook, Clock, MessageSquare, Link2, Shield, Smartphone, CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { ActivityTimeline, CommentsSection } from "@/components/activities";
import { RelatedRecordsPanel } from "@/components/related-records";
import { DocumentsByYear } from "@/components/documents/documents-by-year";
import { QuickActionsMenu } from "@/components/quick-actions";
import { CorporationSummaryCard } from "@/components/summary-card";
import { PortalAccessDialog } from "@/components/contacts/portal-access-dialog";
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

  useEffect(() => {
    getCorporation(id)
      .then(setCorp)
      .catch(console.error)
      .finally(() => setLoading(false));
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

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-[600px]">
          <TabsTrigger value="details" className="gap-2">
            <Building2 className="h-4 w-4" />
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
        </TabsList>

        <TabsContent value="details" className="mt-6 space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Organization Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Organization Details
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
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
            {/* Mobile App Access Section */}
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
      </div>

      {/* Address Section - Full Width */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Billing Address */}
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

        {/* Shipping Address */}
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

      {/* Created/Updated By */}
      <Card>
        <CardHeader>
          <CardTitle>Record Information</CardTitle>
        </CardHeader>
        <CardContent className="text-sm grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Created By</p>
            <p className="font-medium">{corp.created_by?.full_name || "-"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Last Modified</p>
            <p className="font-medium">{new Date(corp.updated_at).toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="related" className="mt-6">
          <RelatedRecordsPanel
            entityType="corporation"
            entityId={id}
          />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <DocumentsByYear
                entityType="corporation"
                entityId={id}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <ActivityTimeline
                entityType="corporation"
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
                entityType="corporation"
                entityId={id}
                maxHeight="calc(100vh - 400px)"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
