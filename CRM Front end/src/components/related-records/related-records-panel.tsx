"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Briefcase,
  Calendar,
  FileText,
  Mail,
  ChevronRight,
  ChevronDown,
  Loader2,
  Plus,
  ExternalLink,
  DollarSign,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import api from "@/lib/api";

interface RelatedCase {
  id: string;
  case_number: string;
  case_type: string;
  status: string;
  year: number;
  created_at: string;
}

interface RelatedAppointment {
  id: string;
  title: string;
  start_datetime: string;
  status: string;
}

interface RelatedDocument {
  id: string;
  title: string;
  doc_type: string;
  created_at: string;
}

interface RelatedEmail {
  id: string;
  subject: string;
  from_address: string;
  created_at: string;
}

interface RelatedQuote {
  id: string;
  quote_number: string;
  subject: string;
  total: number;
  status: string;
  created_at: string;
}

interface RelatedTask {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  priority: string;
}

interface RelatedRecordsPanelProps {
  entityType: "contact" | "corporation";
  entityId: string;
  className?: string;
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
  onAdd?: () => void;
  addHref?: string;
}

function Section({ title, icon, count, children, defaultOpen = false, onAdd, addHref }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border-b">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              {icon}
              <span className="font-medium text-sm">{title}</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {count}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              {(onAdd || addHref) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onAdd) onAdd();
                  }}
                  asChild={!!addHref}
                >
                  {addHref ? (
                    <Link href={addHref}>
                      <Plus className="h-4 w-4" />
                    </Link>
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
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
          <div className="px-4 pb-3">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function StatusBadge({ status }: { status: string }) {
  const getVariant = () => {
    const s = status.toLowerCase();
    if (s === "completed" || s === "closed" || s === "sent") return "default";
    if (s === "pending" || s === "scheduled" || s === "draft") return "secondary";
    if (s === "in_progress" || s === "confirmed") return "outline";
    if (s === "cancelled" || s === "rejected") return "destructive";
    return "secondary";
  };

  return (
    <Badge variant={getVariant()} className="text-xs">
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

export function RelatedRecordsPanel({
  entityType,
  entityId,
  className,
}: RelatedRecordsPanelProps) {
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<RelatedCase[]>([]);
  const [appointments, setAppointments] = useState<RelatedAppointment[]>([]);
  const [documents, setDocuments] = useState<RelatedDocument[]>([]);
  const [emails, setEmails] = useState<RelatedEmail[]>([]);
  const [quotes, setQuotes] = useState<RelatedQuote[]>([]);
  const [tasks, setTasks] = useState<RelatedTask[]>([]);

  useEffect(() => {
    async function fetchRelatedRecords() {
      setLoading(true);
      try {
        const params = entityType === "contact"
          ? { contact: entityId }
          : { corporation: entityId };

        const [casesRes, appointmentsRes, documentsRes, emailsRes, quotesRes, tasksRes] = await Promise.allSettled([
          api.get("/cases/", { params: { ...params, page_size: 5 } }),
          api.get("/appointments/", { params: { ...params, page_size: 5 } }),
          api.get("/documents/", { params: { ...params, page_size: 5 } }),
          api.get("/emails/messages/", { params: { ...params, page_size: 5 } }),
          api.get("/quotes/", { params: { ...params, page_size: 5 } }),
          api.get("/tasks/", { params: { ...params, page_size: 5 } }),
        ]);

        if (casesRes.status === "fulfilled") setCases(casesRes.value.data.results || []);
        if (appointmentsRes.status === "fulfilled") setAppointments(appointmentsRes.value.data.results || []);
        if (documentsRes.status === "fulfilled") setDocuments(documentsRes.value.data.results || []);
        if (emailsRes.status === "fulfilled") setEmails(emailsRes.value.data.results || []);
        if (quotesRes.status === "fulfilled") setQuotes(quotesRes.value.data.results || []);
        if (tasksRes.status === "fulfilled") setTasks(tasksRes.value.data.results || []);
      } catch (error) {
        console.error("Error fetching related records:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchRelatedRecords();
  }, [entityType, entityId]);

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const contactParam = entityType === "contact" ? `?contact=${entityId}` : `?corporation=${entityId}`;

  return (
    <div className={cn("border rounded-lg bg-card", className)}>
      <div className="px-4 py-3 border-b bg-muted/30">
        <h3 className="font-semibold text-sm">Related Records</h3>
      </div>

      {/* Cases */}
      <Section
        title="Cases"
        icon={<Briefcase className="h-4 w-4 text-blue-600" />}
        count={cases.length}
        defaultOpen={cases.length > 0}
        addHref={`/cases/new${contactParam}`}
      >
        {cases.length === 0 ? (
          <p className="text-sm text-muted-foreground">No cases found</p>
        ) : (
          <div className="space-y-2">
            {cases.map((c) => (
              <Link
                key={c.id}
                href={`/cases/${c.id}`}
                className="block p-2 rounded-md border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{c.case_number}</span>
                  <StatusBadge status={c.status} />
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {c.case_type.replace(/_/g, " ")} &bull; {c.year}
                </div>
              </Link>
            ))}
            {cases.length >= 5 && (
              <Link
                href={`/cases${contactParam}`}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                View all <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        )}
      </Section>

      {/* Appointments */}
      <Section
        title="Appointments"
        icon={<Calendar className="h-4 w-4 text-indigo-600" />}
        count={appointments.length}
        defaultOpen={appointments.length > 0}
        addHref={`/appointments/new${contactParam}`}
      >
        {appointments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No appointments found</p>
        ) : (
          <div className="space-y-2">
            {appointments.map((a) => (
              <Link
                key={a.id}
                href={`/appointments/${a.id}`}
                className="block p-2 rounded-md border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate">{a.title}</span>
                  <StatusBadge status={a.status} />
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {format(new Date(a.start_datetime), "MMM d, yyyy h:mm a")}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>

      {/* Quotes */}
      <Section
        title="Quotes"
        icon={<DollarSign className="h-4 w-4 text-green-600" />}
        count={quotes.length}
        addHref={`/quotes/new${contactParam}`}
      >
        {quotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No quotes found</p>
        ) : (
          <div className="space-y-2">
            {quotes.map((q) => (
              <Link
                key={q.id}
                href={`/quotes/${q.id}`}
                className="block p-2 rounded-md border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{q.quote_number}</span>
                  <StatusBadge status={q.status} />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                  <span className="truncate">{q.subject}</span>
                  <span className="font-medium">${q.total?.toLocaleString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>

      {/* Tasks */}
      <Section
        title="Tasks"
        icon={<ClipboardList className="h-4 w-4 text-orange-600" />}
        count={tasks.length}
        addHref={`/tasks/new${contactParam}`}
      >
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks found</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((t) => (
              <Link
                key={t.id}
                href={`/tasks/${t.id}`}
                className="block p-2 rounded-md border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate">{t.title}</span>
                  <StatusBadge status={t.status} />
                </div>
                {t.due_date && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Due: {format(new Date(t.due_date), "MMM d, yyyy")}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </Section>

      {/* Documents */}
      <Section
        title="Documents"
        icon={<FileText className="h-4 w-4 text-amber-600" />}
        count={documents.length}
        addHref={`/documents${contactParam}`}
      >
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents found</p>
        ) : (
          <div className="space-y-2">
            {documents.map((d) => (
              <Link
                key={d.id}
                href={`/documents/${d.id}`}
                className="block p-2 rounded-md border hover:bg-muted/50 transition-colors"
              >
                <div className="font-medium text-sm truncate">{d.title}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {d.doc_type.replace(/_/g, " ")} &bull;{" "}
                  {format(new Date(d.created_at), "MMM d, yyyy")}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>

      {/* Emails */}
      <Section
        title="Emails"
        icon={<Mail className="h-4 w-4 text-sky-600" />}
        count={emails.length}
      >
        {emails.length === 0 ? (
          <p className="text-sm text-muted-foreground">No emails found</p>
        ) : (
          <div className="space-y-2">
            {emails.map((e) => (
              <Link
                key={e.id}
                href={`/inbox/${e.id}`}
                className="block p-2 rounded-md border hover:bg-muted/50 transition-colors"
              >
                <div className="font-medium text-sm truncate">{e.subject || "(No subject)"}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  From: {e.from_address} &bull;{" "}
                  {format(new Date(e.created_at), "MMM d, yyyy")}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
