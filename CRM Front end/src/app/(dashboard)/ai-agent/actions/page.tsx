"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  getActions,
  getAction,
  approveAction,
  rejectAction,
  recordOutcome,
} from "@/lib/api/ai-agent";
import type {
  AgentActionListItem,
  AgentAction,
} from "@/types/ai-agent";
import { ACTION_STATUS_COLORS, ACTION_STATUS_LABELS, ACTION_TYPE_LABELS } from "@/types/ai-agent";
import type { PaginatedResponse } from "@/types/api";

export default function AIAgentActionsPage() {
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PaginatedResponse<AgentActionListItem> | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams.get("status") || ""
  );
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Detail modal
  const [selectedAction, setSelectedAction] = useState<AgentAction | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Outcome modal
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [outcomeText, setOutcomeText] = useState("");
  const [outcomeScore, setOutcomeScore] = useState(0);
  const [recordingOutcome, setRecordingOutcome] = useState(false);

  const [approving, setApproving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page) };
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.action_type = typeFilter;

      const result = await getActions(params);
      setData(result);
    } catch (err) {
      console.error("Failed to fetch actions:", err);
      setMessage({ type: "error", text: "Failed to load actions" });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Handle action parameter in URL
  useEffect(() => {
    const actionId = searchParams.get("action");
    if (actionId) {
      handleViewAction(actionId);
    }
  }, [searchParams]);

  const handleViewAction = async (id: string) => {
    setDetailLoading(true);
    setShowDetailModal(true);
    try {
      const action = await getAction(id);
      setSelectedAction(action);
    } catch (err) {
      console.error("Failed to fetch action:", err);
      setMessage({ type: "error", text: "Failed to load action details" });
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedAction) return;
    setApproving(true);
    try {
      await approveAction(selectedAction.id, { execute_immediately: true });
      setMessage({ type: "success", text: "Action approved and executed" });
      setShowDetailModal(false);
      setSelectedAction(null);
      fetchData();
    } catch (err) {
      console.error("Failed to approve:", err);
      setMessage({ type: "error", text: "Failed to approve action" });
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedAction) return;
    setRejecting(true);
    try {
      await rejectAction(selectedAction.id, { reason: rejectReason });
      setMessage({ type: "success", text: "Action rejected" });
      setShowRejectModal(false);
      setShowDetailModal(false);
      setSelectedAction(null);
      setRejectReason("");
      fetchData();
    } catch (err) {
      console.error("Failed to reject:", err);
      setMessage({ type: "error", text: "Failed to reject action" });
    } finally {
      setRejecting(false);
    }
  };

  const handleRecordOutcome = async () => {
    if (!selectedAction) return;
    setRecordingOutcome(true);
    try {
      await recordOutcome(selectedAction.id, {
        outcome: outcomeText,
        score: outcomeScore,
      });
      setMessage({ type: "success", text: "Outcome recorded" });
      setShowOutcomeModal(false);
      setShowDetailModal(false);
      setSelectedAction(null);
      setOutcomeText("");
      setOutcomeScore(0);
      fetchData();
    } catch (err) {
      console.error("Failed to record outcome:", err);
      setMessage({ type: "error", text: "Failed to record outcome" });
    } finally {
      setRecordingOutcome(false);
    }
  };

  const totalPages = data ? Math.ceil(data.count / 25) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Agent Actions</h1>
        <p className="text-muted-foreground">
          View and manage AI agent actions
        </p>
      </div>

      {/* Message */}
      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              {Object.entries(ACTION_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Select
          value={typeFilter}
          onValueChange={(v) => {
            setTypeFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All action types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All action types</SelectItem>
            {Object.entries(ACTION_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : !data?.results.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Clock className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No actions found</p>
            <p className="text-muted-foreground">
              Actions will appear here when the AI agent takes them
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Related To</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((action) => (
                  <TableRow key={action.id}>
                    <TableCell className="font-medium max-w-[300px] truncate">
                      {action.title}
                    </TableCell>
                    <TableCell>{action.action_type_display}</TableCell>
                    <TableCell>
                      <Badge
                        className={ACTION_STATUS_COLORS[action.status]}
                        variant="secondary"
                      >
                        {action.status_display}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {action.contact_name || action.case_number || "-"}
                    </TableCell>
                    <TableCell>
                      {format(new Date(action.created_at), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewAction(action.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {data.results.length} of {data.count} actions
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {detailLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : selectedAction ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedAction.title}</DialogTitle>
                <DialogDescription>
                  {selectedAction.action_type_display}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Status */}
                <div className="flex items-center gap-2">
                  <span className="font-medium">Status:</span>
                  <Badge
                    className={ACTION_STATUS_COLORS[selectedAction.status]}
                    variant="secondary"
                  >
                    {selectedAction.status_display}
                  </Badge>
                </div>

                {/* Description */}
                <div>
                  <h4 className="font-medium mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedAction.description}
                  </p>
                </div>

                {/* Reasoning */}
                {selectedAction.reasoning && (
                  <div>
                    <h4 className="font-medium mb-1">AI Reasoning</h4>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                      {selectedAction.reasoning}
                    </p>
                  </div>
                )}

                {/* Related Entities */}
                <div className="grid gap-2">
                  {selectedAction.related_contact && (
                    <div className="text-sm">
                      <span className="font-medium">Contact:</span>{" "}
                      {selectedAction.related_contact.name}
                    </div>
                  )}
                  {selectedAction.related_case && (
                    <div className="text-sm">
                      <span className="font-medium">Case:</span>{" "}
                      {selectedAction.related_case.case_number}
                    </div>
                  )}
                  {selectedAction.related_task && (
                    <div className="text-sm">
                      <span className="font-medium">Task:</span>{" "}
                      {selectedAction.related_task.title}
                    </div>
                  )}
                  {selectedAction.related_appointment && (
                    <div className="text-sm">
                      <span className="font-medium">Appointment:</span>{" "}
                      {selectedAction.related_appointment.title}
                    </div>
                  )}
                </div>

                {/* Execution Result */}
                {selectedAction.execution_result && (
                  <div>
                    <h4 className="font-medium mb-1">Execution Result</h4>
                    <p className="text-sm text-green-600">
                      {selectedAction.execution_result}
                    </p>
                  </div>
                )}

                {/* Error */}
                {selectedAction.error_message && (
                  <div>
                    <h4 className="font-medium mb-1">Error</h4>
                    <p className="text-sm text-red-600">
                      {selectedAction.error_message}
                    </p>
                  </div>
                )}

                {/* Rejection */}
                {selectedAction.rejection_reason && (
                  <div>
                    <h4 className="font-medium mb-1">Rejection Reason</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedAction.rejection_reason}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Rejected by {selectedAction.rejected_by_name} on{" "}
                      {selectedAction.rejected_at &&
                        format(new Date(selectedAction.rejected_at), "MMM d, yyyy HH:mm")}
                    </p>
                  </div>
                )}

                {/* Outcome */}
                {selectedAction.outcome && (
                  <div>
                    <h4 className="font-medium mb-1">Outcome</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedAction.outcome}
                    </p>
                    <p className="text-sm mt-1">
                      Score: {selectedAction.outcome_score}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                {selectedAction.status === "pending" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setShowRejectModal(true)}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                    <Button onClick={handleApprove} disabled={approving}>
                      <Check className="mr-2 h-4 w-4" />
                      {approving ? "Approving..." : "Approve & Execute"}
                    </Button>
                  </>
                )}
                {selectedAction.status === "executed" &&
                  !selectedAction.outcome_score && (
                    <Button onClick={() => setShowOutcomeModal(true)}>
                      Record Outcome
                    </Button>
                  )}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Action</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this action
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Why is this action being rejected?"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejecting}
            >
              {rejecting ? "Rejecting..." : "Reject Action"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Outcome Modal */}
      <Dialog open={showOutcomeModal} onOpenChange={setShowOutcomeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Outcome</DialogTitle>
            <DialogDescription>
              How did this action turn out?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="outcome">Outcome Description</Label>
              <Textarea
                id="outcome"
                value={outcomeText}
                onChange={(e) => setOutcomeText(e.target.value)}
                placeholder="Describe the outcome of this action..."
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="score">Score: {outcomeScore.toFixed(1)}</Label>
              <p className="text-sm text-muted-foreground mb-2">
                -1 = Bad outcome, 0 = Neutral, 1 = Good outcome
              </p>
              <Input
                id="score"
                type="range"
                min="-1"
                max="1"
                step="0.1"
                value={outcomeScore}
                onChange={(e) => setOutcomeScore(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOutcomeModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRecordOutcome}
              disabled={recordingOutcome || !outcomeText}
            >
              {recordingOutcome ? "Saving..." : "Save Outcome"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
