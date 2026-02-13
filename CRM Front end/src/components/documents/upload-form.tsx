"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createDocument, getFolders, getTags } from "@/lib/api/documents";
import type { DocumentFolder, DocumentTag } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const docTypes = [
  { value: "w2", label: "W-2" }, { value: "1099", label: "1099" },
  { value: "tax_return", label: "Tax Return" }, { value: "id_document", label: "ID Document" },
  { value: "bank_statement", label: "Bank Statement" }, { value: "authorization", label: "Authorization" },
  { value: "correspondence", label: "Correspondence" }, { value: "receipt", label: "Receipt" },
  { value: "other", label: "Other" },
];

export function UploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("other");
  const [description, setDescription] = useState("");
  const [contactId, setContactId] = useState("");
  const [caseId, setCaseId] = useState("");
  const [folderId, setFolderId] = useState("__none__");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Available folders and tags
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [availableTags, setAvailableTags] = useState<DocumentTag[]>([]);

  useEffect(() => {
    getFolders({ page_size: "200" }).then((res) => setFolders(res.results)).catch(console.error);
    getTags({ page_size: "200" }).then((res) => setAvailableTags(res.results)).catch(console.error);
  }, []);

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      formData.append("doc_type", docType);
      if (description) formData.append("description", description);
      if (contactId) formData.append("contact", contactId);
      if (caseId) formData.append("case", caseId);
      if (folderId && folderId !== "__none__") formData.append("folder", folderId);
      selectedTagIds.forEach((id) => formData.append("tags", id));
      await createDocument(formData);
      router.push("/documents");
    } catch { alert("Upload failed"); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label>File *</Label>
        <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2"><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="space-y-2"><Label>Document Type</Label>
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{docTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Folder</Label>
          <Select value={folderId} onValueChange={setFolderId}>
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {folders.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-1.5 rounded-md border px-3 py-2 min-h-[40px]">
            {availableTags.map((tag) => (
              <Badge
                key={tag.id}
                variant={selectedTagIds.includes(tag.id) ? "default" : "outline"}
                className="cursor-pointer text-xs"
                style={
                  selectedTagIds.includes(tag.id)
                    ? { backgroundColor: tag.color, borderColor: tag.color }
                    : { borderColor: tag.color, color: tag.color }
                }
                onClick={() => toggleTag(tag.id)}
              >
                {tag.name}
              </Badge>
            ))}
            {availableTags.length === 0 && <span className="text-xs text-muted-foreground">No tags available</span>}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2"><Label>Contact ID</Label><Input value={contactId} onChange={(e) => setContactId(e.target.value)} placeholder="UUID (optional)" /></div>
        <div className="space-y-2"><Label>Case ID</Label><Input value={caseId} onChange={(e) => setCaseId(e.target.value)} placeholder="UUID (optional)" /></div>
      </div>
      <div className="space-y-2"><Label>Description</Label><textarea className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      <Button type="submit" disabled={loading || !file || !title}>{loading ? "Uploading..." : "Upload Document"}</Button>
    </form>
  );
}
