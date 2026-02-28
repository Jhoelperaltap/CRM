"use client";

import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, User, Building2, Calendar, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaxCaseListItem } from "@/types";

interface CaseCardProps {
  case_: TaxCaseListItem;
}

export function CaseCard({ case_ }: CaseCardProps) {
  const router = useRouter();

  const initials = case_.title
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  const handleClick = () => {
    router.push(`/cases/${case_.id}`);
  };

  const formatCaseType = (type?: string) => {
    if (!type) return null;
    const labels: Record<string, string> = {
      individual_1040: "Individual 1040",
      business_1120: "Business 1120",
      business_1120s: "Business 1120-S",
      partnership_1065: "Partnership 1065",
      estate_1041: "Estate 1041",
      trust_1041: "Trust 1041",
      exempt_org_990: "Exempt Org 990",
      payroll_941: "Payroll 941",
      sales_tax: "Sales Tax",
      other: "Other",
    };
    return labels[type] || type;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "new":
        return "border-blue-200 bg-blue-50 text-blue-700";
      case "in_progress":
        return "border-yellow-200 bg-yellow-50 text-yellow-700";
      case "pending_review":
        return "border-purple-200 bg-purple-50 text-purple-700";
      case "pending_client":
        return "border-orange-200 bg-orange-50 text-orange-700";
      case "ready_to_file":
        return "border-cyan-200 bg-cyan-50 text-cyan-700";
      case "filed":
        return "border-green-200 bg-green-50 text-green-700";
      case "closed":
        return "border-gray-200 bg-gray-50 text-gray-600";
      case "on_hold":
        return "border-red-200 bg-red-50 text-red-600";
      default:
        return "border-gray-200 bg-gray-50 text-gray-600";
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "border-red-200 bg-red-50 text-red-700";
      case "high":
        return "border-orange-200 bg-orange-50 text-orange-700";
      case "normal":
        return "border-blue-200 bg-blue-50 text-blue-700";
      case "low":
        return "border-gray-200 bg-gray-50 text-gray-600";
      default:
        return "border-gray-200 bg-gray-50 text-gray-600";
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return null;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow group bg-white shadow-sm"
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <Avatar className="h-12 w-12 flex-shrink-0">
            <AvatarFallback className="bg-blue-600 text-white text-sm font-medium">
              {initials || "?"}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1">
            {/* Case Number and Status */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                  {case_.case_number}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {case_.title}
                </p>
              </div>
              <Badge
                variant="outline"
                className={cn("text-xs flex-shrink-0", getStatusBadgeColor(case_.status))}
              >
                {case_.status.replace(/_/g, " ")}
              </Badge>
            </div>

            {/* Case Type and Year Badges */}
            <div className="flex items-center gap-2 pt-1">
              {case_.case_type && (
                <Badge variant="secondary" className="text-xs">
                  {formatCaseType(case_.case_type)}
                </Badge>
              )}
              {case_.fiscal_year && (
                <Badge variant="outline" className="text-xs">
                  FY {case_.fiscal_year}
                </Badge>
              )}
              {case_.priority && (
                <Badge
                  variant="outline"
                  className={cn("text-xs", getPriorityBadgeColor(case_.priority))}
                >
                  {case_.priority}
                </Badge>
              )}
            </div>

            {/* Client Name */}
            {case_.contact_name && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{case_.contact_name}</span>
              </div>
            )}

            {/* Due Date */}
            {case_.due_date && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">Due: {formatDate(case_.due_date)}</span>
              </div>
            )}

            {/* Fee Information */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
              {case_.estimated_fee !== null && case_.estimated_fee !== undefined && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <DollarSign className="h-3 w-3" />
                  <span>Est: {formatCurrency(case_.estimated_fee)}</span>
                </div>
              )}
              {case_.assigned_preparer_name && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  <span className="truncate max-w-[120px]">{case_.assigned_preparer_name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
