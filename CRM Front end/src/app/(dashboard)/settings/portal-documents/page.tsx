"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentReviewCard } from "@/components/settings/document-review-card";
import { getPortalDocuments } from "@/lib/api/settings";
import type { StaffDocumentReview } from "@/types/settings";

export default function PortalDocumentsPage() {
  const [documents, setDocuments] = useState<StaffDocumentReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchDocuments = useCallback(async (status?: string) => {
    setLoading(true);
    try {
      const params = status && status !== "all" ? { status } : undefined;
      const data = await getPortalDocuments(params);
      setDocuments(data.results);
    } catch {
      setMessage({ type: "error", text: "Failed to load documents." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments(tab);
  }, [fetchDocuments, tab]);

  const handleUpdated = (updated: StaffDocumentReview) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === updated.id ? updated : d))
    );
    setMessage({
      type: "success",
      text: `Document ${updated.status === "approved" ? "approved" : "rejected"}.`,
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Portal Documents"
        description="Review documents uploaded by clients through the portal"
      />

      {message && (
        <div
          className={`rounded-md px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {loading ? (
            <LoadingSpinner />
          ) : documents.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No documents found.
            </p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <DocumentReviewCard
                  key={doc.id}
                  doc={doc}
                  onUpdated={handleUpdated}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
