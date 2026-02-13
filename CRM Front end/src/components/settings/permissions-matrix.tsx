"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Save } from "lucide-react";
import type { ExtendedModulePermission } from "@/types/settings";

const ACTION_COLUMNS = [
  { key: "can_view", label: "View" },
  { key: "can_create", label: "Create" },
  { key: "can_edit", label: "Edit" },
  { key: "can_delete", label: "Delete" },
  { key: "can_export", label: "Export" },
  { key: "can_import", label: "Import" },
] as const;

type ActionKey = (typeof ACTION_COLUMNS)[number]["key"];

interface PermissionsMatrixProps {
  permissions: ExtendedModulePermission[];
  onSave?: (permissions: ExtendedModulePermission[]) => void;
  readOnly?: boolean;
}

export function PermissionsMatrix({
  permissions,
  onSave,
  readOnly = false,
}: PermissionsMatrixProps) {
  const [local, setLocal] = useState<ExtendedModulePermission[]>([]);

  useEffect(() => {
    setLocal(permissions.map((p) => ({ ...p })));
  }, [permissions]);

  const toggle = (index: number, key: ActionKey) => {
    if (readOnly) return;
    setLocal((prev) => {
      const next = prev.map((p) => ({ ...p }));
      next[index] = { ...next[index], [key]: !next[index][key] };
      return next;
    });
  };

  const handleSave = () => {
    onSave?.(local);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Module</TableHead>
              {ACTION_COLUMNS.map((col) => (
                <TableHead key={col.key} className="text-center w-[100px]">
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {local.map((perm, idx) => (
              <TableRow key={perm.id || perm.module}>
                <TableCell className="font-medium capitalize">
                  {perm.module.replace(/_/g, " ")}
                </TableCell>
                {ACTION_COLUMNS.map((col) => (
                  <TableCell key={col.key} className="text-center">
                    <input
                      type="checkbox"
                      checked={perm[col.key]}
                      disabled={readOnly}
                      onChange={() => toggle(idx, col.key)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {local.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={ACTION_COLUMNS.length + 1}
                  className="text-center text-muted-foreground py-8"
                >
                  No permissions configured.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {!readOnly && onSave && (
        <div className="flex justify-end">
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save Permissions
          </Button>
        </div>
      )}
    </div>
  );
}
