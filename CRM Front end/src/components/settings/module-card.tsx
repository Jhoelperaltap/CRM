"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type { CRMModule } from "@/types/index";
import {
  Users,
  Building,
  Briefcase,
  FileText,
  Calendar,
  File,
  CheckSquare,
  LayoutDashboard,
  UserCog,
  Shield,
  Box,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Users,
  Building,
  Briefcase,
  FileText,
  Calendar,
  File,
  CheckSquare,
  LayoutDashboard,
  UserCog,
  Shield,
};

interface ModuleCardProps {
  module: CRMModule;
  onToggle: (id: string) => void;
  onClick: (id: string) => void;
  toggling?: boolean;
}

export function ModuleCard({ module, onToggle, onClick, toggling }: ModuleCardProps) {
  const Icon = ICON_MAP[module.icon] || Box;

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-accent/50"
      onClick={() => onClick(module.id)}
    >
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">{module.label_plural}</CardTitle>
            <p className="text-xs text-muted-foreground">{module.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Switch
            checked={module.is_active}
            onCheckedChange={() => onToggle(module.id)}
            disabled={toggling}
          />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {module.description || "No description"}
        </p>
        <div className="flex items-center gap-2">
          <Badge variant={module.is_active ? "default" : "secondary"}>
            {module.is_active ? "Active" : "Inactive"}
          </Badge>
          {module.number_prefix && (
            <Badge variant="outline">{module.number_prefix}</Badge>
          )}
          {module.custom_fields_count > 0 && (
            <Badge variant="outline">
              {module.custom_fields_count} custom field
              {module.custom_fields_count !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
