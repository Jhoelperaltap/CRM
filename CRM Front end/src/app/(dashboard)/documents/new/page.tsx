"use client";
import { UploadForm } from "@/components/documents/upload-form";
import { PageHeader } from "@/components/ui/page-header";

export default function NewDocumentPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Upload Document" backHref="/documents" />
      <div className="rounded-lg border p-6"><UploadForm /></div>
    </div>
  );
}
