"use client";

import { useState } from "react";
import { ChevronDown, Check, AlertTriangle, Loader2, XCircle, PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { changeClientStatus, type ClientStatus } from "@/lib/api/corporations";
import type { Corporation } from "@/types";
import { cn } from "@/lib/utils";

interface ClientStatusDropdownProps {
  corporation: Corporation;
  onStatusChange: (updatedCorp: Corporation) => void;
}

const STATUS_CONFIG: Record<
  ClientStatus,
  { label: string; color: string; bgColor: string; borderColor: string; dotColor: string }
> = {
  active: {
    label: "Active",
    color: "text-green-700",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    dotColor: "bg-green-500",
  },
  payment_pending: {
    label: "Payment Pending",
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    dotColor: "bg-red-500",
  },
  paid: {
    label: "Paid",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    dotColor: "bg-emerald-500",
  },
  paused: {
    label: "Paused",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    dotColor: "bg-amber-500",
  },
  business_closed: {
    label: "Business Closed",
    color: "text-gray-700",
    bgColor: "bg-gray-100",
    borderColor: "border-gray-300",
    dotColor: "bg-gray-500",
  },
};

export function ClientStatusDropdown({
  corporation,
  onStatusChange,
}: ClientStatusDropdownProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [closureDialogOpen, setClosureDialogOpen] = useState(false);
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [closureReason, setClosureReason] = useState("");
  const [pauseReason, setPauseReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const currentStatus = corporation.client_status as ClientStatus;
  const currentConfig = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.active;

  const handleStatusChange = async (newStatus: ClientStatus) => {
    if (newStatus === "business_closed") {
      setClosureDialogOpen(true);
      return;
    }
    if (newStatus === "paused") {
      setPauseDialogOpen(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const updatedCorp = await changeClientStatus(corporation.id, {
        client_status: newStatus,
      });
      onStatusChange(updatedCorp);
    } catch (err: unknown) {
      console.error("Failed to update status:", err);
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseBusiness = async () => {
    if (!closureReason.trim()) {
      setError("Please provide a reason for closing the business");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const updatedCorp = await changeClientStatus(corporation.id, {
        client_status: "business_closed",
        closure_reason: closureReason.trim(),
      });
      onStatusChange(updatedCorp);
      setClosureDialogOpen(false);
      setClosureReason("");
    } catch (err: unknown) {
      console.error("Failed to close business:", err);
      setError(err instanceof Error ? err.message : "Failed to close business");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePauseBusiness = async () => {
    if (!pauseReason.trim()) {
      setError("Please provide a reason for pausing the business");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const updatedCorp = await changeClientStatus(corporation.id, {
        client_status: "paused",
        pause_reason: pauseReason.trim(),
      });
      onStatusChange(updatedCorp);
      setPauseDialogOpen(false);
      setPauseReason("");
    } catch (err: unknown) {
      console.error("Failed to pause business:", err);
      setError(err instanceof Error ? err.message : "Failed to pause business");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "min-w-[160px] justify-between border",
              currentConfig.bgColor,
              currentConfig.borderColor
            )}
            disabled={isLoading}
          >
            <span className={cn("font-medium", currentConfig.color)}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                currentConfig.label
              )}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          {(Object.keys(STATUS_CONFIG) as ClientStatus[]).map((status) => {
            const config = STATUS_CONFIG[status];
            const isSelected = status === currentStatus;

            return (
              <DropdownMenuItem
                key={status}
                onClick={() => handleStatusChange(status)}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", config.dotColor)} />
                  <span className={status === "business_closed" ? "text-red-600" : status === "paused" ? "text-amber-600" : ""}>
                    {config.label}
                  </span>
                  {status === "business_closed" && (
                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                  )}
                  {status === "paused" && (
                    <PauseCircle className="h-3.5 w-3.5 text-amber-500" />
                  )}
                </div>
                {isSelected && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Closure Confirmation Dialog */}
      <Dialog open={closureDialogOpen} onOpenChange={(open) => {
        setClosureDialogOpen(open);
        if (!open) {
          setError(null);
          setClosureReason("");
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Close Business
            </DialogTitle>
            <DialogDescription>
              You are about to mark <strong>{corporation.name}</strong> as closed.
              This action can be reversed, but requires a reason for documentation.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg border-2 border-red-200 bg-red-50 p-3 mb-4">
              <p className="text-sm text-red-700">
                <strong>Important:</strong> Closing a business will flag this
                organization as no longer active. All associated records will be
                preserved.
              </p>
            </div>
            {error && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-3 mb-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="closure-reason" className="text-sm font-medium">
                Reason for Closure <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="closure-reason"
                placeholder="Enter the reason for closing this business (e.g., bankruptcy, sold, dissolved, etc.)"
                value={closureReason}
                onChange={(e) => {
                  setClosureReason(e.target.value);
                  setError(null);
                }}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setClosureDialogOpen(false);
                setClosureReason("");
                setError(null);
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleCloseBusiness}
              disabled={isLoading || !closureReason.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Closing...
                </>
              ) : (
                "Close Business"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pause Confirmation Dialog */}
      <Dialog open={pauseDialogOpen} onOpenChange={(open) => {
        setPauseDialogOpen(open);
        if (!open) {
          setError(null);
          setPauseReason("");
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <PauseCircle className="h-5 w-5" />
              Pause Business
            </DialogTitle>
            <DialogDescription>
              You are about to pause services for <strong>{corporation.name}</strong>.
              This is a temporary status that can be changed at any time.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-3 mb-4">
              <p className="text-sm text-amber-700">
                <strong>Note:</strong> Pausing a business will temporarily suspend
                services. The organization remains in the system and can be reactivated.
              </p>
            </div>
            {error && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-3 mb-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="pause-reason" className="text-sm font-medium">
                Reason for Pause <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="pause-reason"
                placeholder="Enter the reason for pausing this business (e.g., client request, seasonal closure, temporary hold, etc.)"
                value={pauseReason}
                onChange={(e) => {
                  setPauseReason(e.target.value);
                  setError(null);
                }}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPauseDialogOpen(false);
                setPauseReason("");
                setError(null);
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700"
              onClick={handlePauseBusiness}
              disabled={isLoading || !pauseReason.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Pausing...
                </>
              ) : (
                "Pause Business"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
