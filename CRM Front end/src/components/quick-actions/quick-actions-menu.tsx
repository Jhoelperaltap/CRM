"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Briefcase,
  Calendar,
  FileText,
  Mail,
  DollarSign,
  ClipboardList,
  StickyNote,
  Phone,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateAppointmentDialog } from "@/components/appointments/create-appointment-dialog";
import { QuickNoteDialog } from "./quick-note-dialog";
import { QuickTaskDialog } from "./quick-task-dialog";
import { LogCallDialog } from "./log-call-dialog";
import { QuickUploadDialog } from "./quick-upload-dialog";

interface QuickActionsMenuProps {
  entityType: "contact" | "corporation";
  entityId: string;
  entityName: string;
  entityEmail?: string | null;
  onActionComplete?: () => void;
}

export function QuickActionsMenu({
  entityType,
  entityId,
  entityName,
  entityEmail,
  onActionComplete,
}: QuickActionsMenuProps) {
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const handleComplete = () => {
    onActionComplete?.();
  };

  // Build email compose URL with recipient
  const getEmailComposeUrl = () => {
    const params = new URLSearchParams();
    params.set(entityType, entityId);
    if (entityEmail) {
      params.set("to", entityEmail);
    }
    params.set("name", entityName);
    return `/inbox/compose?${params.toString()}`;
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="default" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Quick Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Create New</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => setAppointmentOpen(true)}>
            <Calendar className="h-4 w-4 mr-2 text-indigo-600" />
            Schedule Appointment
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => setTaskOpen(true)}>
            <ClipboardList className="h-4 w-4 mr-2 text-orange-600" />
            Create Task
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => setNoteOpen(true)}>
            <StickyNote className="h-4 w-4 mr-2 text-yellow-600" />
            Add Note
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => setCallOpen(true)}>
            <Phone className="h-4 w-4 mr-2 text-green-600" />
            Log Call
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <Link href={`/cases/new?${entityType}=${entityId}`}>
              <Briefcase className="h-4 w-4 mr-2 text-blue-600" />
              New Case
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href={`/quotes/new?${entityType}=${entityId}`}>
              <DollarSign className="h-4 w-4 mr-2 text-green-600" />
              New Quote
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href={getEmailComposeUrl()}>
              <Mail className="h-4 w-4 mr-2 text-sky-600" />
              Send Email
              {entityEmail && (
                <span className="ml-auto text-xs text-muted-foreground truncate max-w-[100px]">
                  {entityEmail}
                </span>
              )}
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2 text-amber-600" />
            Upload Document
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialogs */}
      <CreateAppointmentDialog
        open={appointmentOpen}
        onOpenChange={setAppointmentOpen}
        contactId={entityType === "contact" ? entityId : undefined}
        contactName={entityType === "contact" ? entityName : undefined}
        corporationId={entityType === "corporation" ? entityId : undefined}
        corporationName={entityType === "corporation" ? entityName : undefined}
        onCreated={handleComplete}
      />

      <QuickNoteDialog
        open={noteOpen}
        onOpenChange={setNoteOpen}
        entityType={entityType}
        entityId={entityId}
        entityName={entityName}
        onCreated={handleComplete}
      />

      <QuickTaskDialog
        open={taskOpen}
        onOpenChange={setTaskOpen}
        entityType={entityType}
        entityId={entityId}
        entityName={entityName}
        onCreated={handleComplete}
      />

      <LogCallDialog
        open={callOpen}
        onOpenChange={setCallOpen}
        entityType={entityType}
        entityId={entityId}
        entityName={entityName}
        onCreated={handleComplete}
      />

      <QuickUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        entityType={entityType}
        entityId={entityId}
        entityName={entityName}
        onUploaded={handleComplete}
      />
    </>
  );
}
