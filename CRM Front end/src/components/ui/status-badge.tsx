import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  // Contact
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
  lead: "bg-blue-100 text-blue-800",
  // Case
  new: "bg-blue-100 text-blue-800",
  waiting_for_documents: "bg-amber-100 text-amber-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  under_review: "bg-purple-100 text-purple-800",
  ready_to_file: "bg-teal-100 text-teal-800",
  filed: "bg-green-100 text-green-800",
  completed: "bg-green-200 text-green-900",
  closed: "bg-gray-200 text-gray-900",
  // Corporation
  dissolved: "bg-red-100 text-red-800",
  // Appointment
  scheduled: "bg-blue-100 text-blue-800",
  confirmed: "bg-indigo-100 text-indigo-800",
  checked_in: "bg-violet-100 text-violet-800",
  cancelled: "bg-red-100 text-red-800",
  no_show: "bg-orange-100 text-orange-800",
  // Document
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  // Quote
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  expired: "bg-amber-100 text-amber-800",
  // Task
  todo: "bg-gray-100 text-gray-800",
  // Priority
  low: "bg-slate-100 text-slate-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colorClass = statusColors[status] || "bg-gray-100 text-gray-800";
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Badge variant="outline" className={cn("border-0 font-medium", colorClass, className)}>
      {label}
    </Badge>
  );
}
