"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Check, X, FileText } from "lucide-react";
import { approvePortalDocument, rejectPortalDocument } from "@/lib/api/settings";
import type { StaffDocumentReview } from "@/types/settings";

interface DocumentReviewCardProps {
  doc: StaffDocumentReview;
  onUpdated: (doc: StaffDocumentReview) => void;
}

export function DocumentReviewCard({ doc, onUpdated }: DocumentReviewCardProps) {
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      const updated = await approvePortalDocument(doc.id);
      onUpdated(updated);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      const updated = await rejectPortalDocument(doc.id, rejectReason);
      onUpdated(updated);
      setShowReject(false);
    } finally {
      setLoading(false);
    }
  };

  const isPending = doc.status === "pending";

  return (
    <>
      <Card>
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="font-medium truncate">{doc.document_title}</p>
              <p className="text-sm text-muted-foreground">
                {doc.contact_name} &middot;{" "}
                {new Date(doc.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={doc.status} />
            {isPending && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleApprove}
                  disabled={loading}
                >
                  <Check className="mr-1 h-3 w-3" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => setShowReject(true)}
                  disabled={loading}
                >
                  <X className="mr-1 h-3 w-3" />
                  Reject
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showReject} onOpenChange={setShowReject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Reason for Rejection</Label>
              <Input
                id="reject-reason"
                placeholder="Enter reason..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowReject(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={loading}
              >
                {loading ? "Rejecting..." : "Reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
