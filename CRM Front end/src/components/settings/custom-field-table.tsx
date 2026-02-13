"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2, GripVertical } from "lucide-react";
import type { CustomField } from "@/types/index";

interface CustomFieldTableProps {
  fields: CustomField[];
  onEdit: (field: CustomField) => void;
  onDelete: (fieldId: string) => void;
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Text",
  number: "Number",
  decimal: "Decimal",
  date: "Date",
  datetime: "Date & Time",
  boolean: "Boolean",
  email: "Email",
  phone: "Phone",
  url: "URL",
  textarea: "Text Area",
  select: "Select",
  multiselect: "Multi-Select",
};

export function CustomFieldTable({
  fields,
  onEdit,
  onDelete,
}: CustomFieldTableProps) {
  if (fields.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No custom fields defined yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8"></TableHead>
          <TableHead>Label</TableHead>
          <TableHead>Field Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Section</TableHead>
          <TableHead>Required</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-20">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {fields.map((field) => (
          <TableRow key={field.id}>
            <TableCell>
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </TableCell>
            <TableCell className="font-medium">{field.label}</TableCell>
            <TableCell className="text-muted-foreground font-mono text-xs">
              {field.field_name}
            </TableCell>
            <TableCell>
              <Badge variant="outline">
                {FIELD_TYPE_LABELS[field.field_type] || field.field_type}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {field.section || "-"}
            </TableCell>
            <TableCell>
              {field.is_required ? (
                <Badge variant="default">Required</Badge>
              ) : (
                <span className="text-muted-foreground text-sm">Optional</span>
              )}
            </TableCell>
            <TableCell>
              <Badge variant={field.is_active ? "default" : "secondary"}>
                {field.is_active ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(field)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(field.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
