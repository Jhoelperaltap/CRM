"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  portalGetInvoice,
  portalSendInvoice,
  portalMarkInvoicePaid,
  portalDeleteInvoice,
  portalGetInvoicePdfUrl,
} from "@/lib/api/portal";
import type { TenantInvoice } from "@/types/portal-billing";
import {
  ArrowLeft,
  Send,
  CheckCircle,
  Download,
  Trash2,
  FileText,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  partial: "bg-yellow-100 text-yellow-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<TenantInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const data = await portalGetInvoice(params.id as string);
        setInvoice(data);
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Failed to load invoice");
      } finally {
        setLoading(false);
      }
    }
    fetchInvoice();
  }, [params.id]);

  const handleSend = async () => {
    if (!invoice) return;
    setActionLoading(true);
    try {
      await portalSendInvoice(invoice.id);
      setInvoice({ ...invoice, status: "sent", status_display: "Sent" });
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to send invoice");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!invoice) return;
    setActionLoading(true);
    try {
      const updated = await portalMarkInvoicePaid(invoice.id);
      setInvoice(updated);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to mark as paid");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!invoice) return;
    if (!confirm("Are you sure you want to delete this invoice?")) return;

    setActionLoading(true);
    try {
      await portalDeleteInvoice(invoice.id);
      router.push("/portal/billing/invoices");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to delete invoice");
      setActionLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    const url = await portalGetInvoicePdfUrl(invoice.id);
    window.open(url, "_blank");
  };

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(parseFloat(value || "0"));
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Invoice not found</h3>
        <Button asChild className="mt-4">
          <Link href="/portal/billing/invoices">Back to Invoices</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/portal/billing/invoices">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{invoice.invoice_number}</h1>
              <Badge className={STATUS_COLORS[invoice.status] || "bg-gray-100"}>
                {invoice.status_display}
              </Badge>
            </div>
            <p className="text-muted-foreground">{invoice.subject}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {invoice.status === "draft" && (
            <Button onClick={handleSend} disabled={actionLoading}>
              <Send className="mr-2 h-4 w-4" />
              Send
            </Button>
          )}
          {["sent", "partial", "overdue"].includes(invoice.status) && (
            <Button onClick={handleMarkPaid} disabled={actionLoading}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark Paid
            </Button>
          )}
          <Button variant="outline" onClick={handleDownloadPdf}>
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
          {invoice.status === "draft" && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={actionLoading}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Customer & Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="font-medium">{invoice.customer_name}</div>
            {invoice.customer_email && <div>{invoice.customer_email}</div>}
            {invoice.customer_phone && <div>{invoice.customer_phone}</div>}
            {invoice.customer_address && (
              <div className="whitespace-pre-line text-muted-foreground">
                {invoice.customer_address}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice Date:</span>
              <span>{formatDate(invoice.invoice_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Due Date:</span>
              <span>{formatDate(invoice.due_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created:</span>
              <span>{formatDate(invoice.created_at)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Totals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax ({invoice.tax_percent}%):</span>
              <span>{formatCurrency(invoice.tax_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount:</span>
              <span>-{formatCurrency(invoice.discount_amount)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-bold">
              <span>Total:</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid:</span>
              <span className="text-green-600">{formatCurrency(invoice.amount_paid)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Amount Due:</span>
              <span className="text-primary">{formatCurrency(invoice.amount_due)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.line_items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium">
                      {item.product_name || item.service_name || "Custom Item"}
                    </div>
                    {item.description && (
                      <div className="text-sm text-muted-foreground">
                        {item.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.unit_price)}
                  </TableCell>
                  <TableCell className="text-right">
                    {parseFloat(item.discount_percent) > 0
                      ? `${item.discount_percent}%`
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Notes */}
      {(invoice.notes || invoice.terms_conditions) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}
          {invoice.terms_conditions && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Terms & Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm">
                  {invoice.terms_conditions}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
