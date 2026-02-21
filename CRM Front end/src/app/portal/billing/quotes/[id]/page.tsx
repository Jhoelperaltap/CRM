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
  portalGetQuote,
  portalSendQuote,
  portalConvertQuoteToInvoice,
  portalDeleteQuote,
  portalGetQuotePdfUrl,
} from "@/lib/api/portal";
import type { TenantQuote } from "@/types/portal-billing";
import {
  ArrowLeft,
  Send,
  FileText,
  Download,
  Trash2,
  ArrowRight,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  expired: "bg-orange-100 text-orange-800",
  converted: "bg-purple-100 text-purple-800",
};

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [quote, setQuote] = useState<TenantQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchQuote() {
      try {
        const data = await portalGetQuote(params.id as string);
        setQuote(data);
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setError(axiosErr?.response?.data?.detail || "Failed to load quote");
      } finally {
        setLoading(false);
      }
    }
    fetchQuote();
  }, [params.id]);

  const handleSend = async () => {
    if (!quote) return;
    setActionLoading(true);
    try {
      await portalSendQuote(quote.id);
      setQuote({ ...quote, status: "sent", status_display: "Sent" });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr?.response?.data?.detail || "Failed to send quote");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvert = async () => {
    if (!quote) return;
    if (!confirm("Convert this quote to an invoice?")) return;

    setActionLoading(true);
    try {
      const result = await portalConvertQuoteToInvoice(quote.id);
      router.push(`/portal/billing/invoices/${result.invoice_id}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr?.response?.data?.detail || "Failed to convert quote");
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!quote) return;
    if (!confirm("Are you sure you want to delete this quote?")) return;

    setActionLoading(true);
    try {
      await portalDeleteQuote(quote.id);
      router.push("/portal/billing/quotes");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr?.response?.data?.detail || "Failed to delete quote");
      setActionLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!quote) return;
    const url = await portalGetQuotePdfUrl(quote.id);
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

  if (!quote) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Quote not found</h3>
        <Button asChild className="mt-4">
          <Link href="/portal/billing/quotes">Back to Quotes</Link>
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
            <Link href="/portal/billing/quotes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{quote.quote_number}</h1>
              <Badge className={STATUS_COLORS[quote.status] || "bg-gray-100"}>
                {quote.status_display}
              </Badge>
            </div>
            <p className="text-muted-foreground">{quote.subject}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {quote.status === "draft" && (
            <Button onClick={handleSend} disabled={actionLoading}>
              <Send className="mr-2 h-4 w-4" />
              Send
            </Button>
          )}
          {["sent", "accepted"].includes(quote.status) && !quote.converted_invoice && (
            <Button onClick={handleConvert} disabled={actionLoading}>
              <ArrowRight className="mr-2 h-4 w-4" />
              Convert to Invoice
            </Button>
          )}
          {quote.converted_invoice && (
            <Button variant="outline" asChild>
              <Link href={`/portal/billing/invoices/${quote.converted_invoice}`}>
                <FileText className="mr-2 h-4 w-4" />
                View Invoice
              </Link>
            </Button>
          )}
          <Button variant="outline" onClick={handleDownloadPdf}>
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
          {quote.status === "draft" && (
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
            <div className="font-medium">{quote.customer_name}</div>
            {quote.customer_email && <div>{quote.customer_email}</div>}
            {quote.customer_phone && <div>{quote.customer_phone}</div>}
            {quote.customer_address && (
              <div className="whitespace-pre-line text-muted-foreground">
                {quote.customer_address}
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
              <span className="text-muted-foreground">Quote Date:</span>
              <span>{formatDate(quote.quote_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valid Until:</span>
              <span>{formatDate(quote.valid_until)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created:</span>
              <span>{formatDate(quote.created_at)}</span>
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
              <span>{formatCurrency(quote.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax ({quote.tax_percent}%):</span>
              <span>{formatCurrency(quote.tax_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount:</span>
              <span>-{formatCurrency(quote.discount_amount)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-bold">
              <span>Total:</span>
              <span className="text-primary">{formatCurrency(quote.total)}</span>
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
              {quote.line_items.map((item) => (
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
      {(quote.notes || quote.terms_conditions) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {quote.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm">{quote.notes}</p>
              </CardContent>
            </Card>
          )}
          {quote.terms_conditions && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Terms & Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm">
                  {quote.terms_conditions}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
