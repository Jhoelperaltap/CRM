"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getQuote,
  deleteQuote,
  sendQuote,
  acceptQuote,
  rejectQuote,
} from "@/lib/api/quotes";
import type { Quote } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2, Send, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchQuote = () => {
    getQuote(id)
      .then(setQuote)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchQuote();
  }, [id]);

  const handleSend = async () => {
    try {
      const updated = await sendQuote(id);
      setQuote(updated);
    } catch {
      alert("Failed to send quote.");
    }
  };

  const handleAccept = async () => {
    try {
      const updated = await acceptQuote(id);
      setQuote(updated);
    } catch {
      alert("Failed to accept quote.");
    }
  };

  const handleReject = async () => {
    try {
      const updated = await rejectQuote(id);
      setQuote(updated);
    } catch {
      alert("Failed to reject quote.");
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!quote) return <div>Quote not found</div>;

  const fmt = (n: number) =>
    `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${quote.quote_number} - ${quote.subject}`}
        backHref="/quotes"
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href={`/quotes/${id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Link>
            </Button>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </>
        }
      />

      {/* Stage + transition buttons */}
      <div className="flex items-center gap-4 flex-wrap">
        <StatusBadge status={quote.stage} />
        {quote.stage === "draft" && (
          <Button size="sm" variant="outline" onClick={handleSend}>
            <Send className="mr-1.5 h-4 w-4" /> Send
          </Button>
        )}
        {quote.stage === "sent" && (
          <>
            <Button size="sm" variant="outline" onClick={handleAccept}>
              <CheckCircle className="mr-1.5 h-4 w-4" /> Accept
            </Button>
            <Button size="sm" variant="outline" onClick={handleReject}>
              <XCircle className="mr-1.5 h-4 w-4" /> Reject
            </Button>
          </>
        )}
      </div>

      {/* Info cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Quote Info</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Contact</span>
              <span>
                {quote.contact
                  ? `${quote.contact.first_name} ${quote.contact.last_name}`
                  : "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Corporation</span>
              <span>{quote.corporation?.name || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Case</span>
              <span>
                {quote.case ? `${quote.case.case_number} - ${quote.case.title}` : "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Assigned To</span>
              <span>{quote.assigned_to?.full_name || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created By</span>
              <span>{quote.created_by?.full_name || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valid Until</span>
              <span>{quote.valid_until || "-"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Totals</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono">{fmt(quote.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount ({Number(quote.discount_percent)}%)</span>
              <span className="font-mono text-destructive">-{fmt(quote.discount_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax ({Number(quote.tax_percent)}%)</span>
              <span className="font-mono">{fmt(quote.tax_amount)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-semibold">
              <span>Total</span>
              <span className="font-mono">{fmt(quote.total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader><CardTitle>Line Items ({quote.line_items.length})</CardTitle></CardHeader>
        <CardContent>
          {quote.line_items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No line items.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Discount %</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quote.line_items.map((li) => (
                    <TableRow key={li.id}>
                      <TableCell>
                        {li.service_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </TableCell>
                      <TableCell>{li.description || "-"}</TableCell>
                      <TableCell className="text-right font-mono">{Number(li.quantity)}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(li.unit_price)}</TableCell>
                      <TableCell className="text-right font-mono">{Number(li.discount_percent)}%</TableCell>
                      <TableCell className="text-right font-mono">{fmt(li.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Address */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Billing Address</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {quote.billing_street || quote.billing_city ? (
              <div>
                {quote.billing_street && <p>{quote.billing_street}</p>}
                <p>
                  {[quote.billing_city, quote.billing_state, quote.billing_zip]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                {quote.billing_country && <p>{quote.billing_country}</p>}
              </div>
            ) : (
              <p className="text-muted-foreground">No billing address provided.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Shipping Address</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {quote.shipping_street || quote.shipping_city ? (
              <div>
                {quote.shipping_street && <p>{quote.shipping_street}</p>}
                <p>
                  {[quote.shipping_city, quote.shipping_state, quote.shipping_zip]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                {quote.shipping_country && <p>{quote.shipping_country}</p>}
              </div>
            ) : (
              <p className="text-muted-foreground">No shipping address provided.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Terms */}
      {(quote.terms_conditions || quote.description) && (
        <Card>
          <CardHeader><CardTitle>Terms & Description</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            {quote.terms_conditions && (
              <div>
                <h4 className="font-medium text-muted-foreground mb-1">Terms & Conditions</h4>
                <p className="whitespace-pre-wrap">{quote.terms_conditions}</p>
              </div>
            )}
            {quote.description && (
              <div>
                <h4 className="font-medium text-muted-foreground mb-1">Description</h4>
                <p className="whitespace-pre-wrap">{quote.description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Quote"
        description="Are you sure you want to delete this quote? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={async () => {
          await deleteQuote(id);
          router.push("/quotes");
        }}
      />
    </div>
  );
}
