"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Lightbulb,
  Target,
  TrendingUp,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  getInsights,
  getInsight,
  acknowledgeInsight,
} from "@/lib/api/ai-agent";
import type { AgentInsightListItem, AgentInsight, InsightType } from "@/types/ai-agent";
import { INSIGHT_TYPE_COLORS, INSIGHT_TYPE_LABELS } from "@/types/ai-agent";
import type { PaginatedResponse } from "@/types/api";

const INSIGHT_ICONS: Record<InsightType, React.ReactNode> = {
  strength: <ArrowUp className="h-4 w-4 text-green-500" />,
  weakness: <ArrowDown className="h-4 w-4 text-red-500" />,
  opportunity: <Target className="h-4 w-4 text-blue-500" />,
  threat: <AlertTriangle className="h-4 w-4 text-orange-500" />,
  trend: <TrendingUp className="h-4 w-4 text-purple-500" />,
  metric: <Lightbulb className="h-4 w-4 text-gray-500" />,
  recommendation: <Lightbulb className="h-4 w-4 text-indigo-500" />,
};

export default function AIAgentInsightsPage() {
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PaginatedResponse<AgentInsightListItem> | null>(null);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [acknowledgedFilter, setAcknowledgedFilter] = useState<string>("all");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Detail modal
  const [selectedInsight, setSelectedInsight] = useState<AgentInsight | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Acknowledge modal
  const [showAcknowledgeModal, setShowAcknowledgeModal] = useState(false);
  const [outcomeText, setOutcomeText] = useState("");
  const [acknowledging, setAcknowledging] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page) };
      if (typeFilter && typeFilter !== "all") params.insight_type = typeFilter;
      if (acknowledgedFilter && acknowledgedFilter !== "all") params.is_acknowledged = acknowledgedFilter;

      const result = await getInsights(params);
      setData(result);
    } catch (err) {
      console.error("Failed to fetch insights:", err);
      setMessage({ type: "error", text: "Failed to load insights" });
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, acknowledgedFilter]);

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

  // Handle insight parameter in URL
  useEffect(() => {
    const insightId = searchParams.get("insight");
    if (insightId) {
      handleViewInsight(insightId);
    }
  }, [searchParams]);

  const handleViewInsight = async (id: string) => {
    setDetailLoading(true);
    setShowDetailModal(true);
    try {
      const insight = await getInsight(id);
      setSelectedInsight(insight);
    } catch (err) {
      console.error("Failed to fetch insight:", err);
      setMessage({ type: "error", text: "Failed to load insight details" });
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!selectedInsight) return;
    setAcknowledging(true);
    try {
      await acknowledgeInsight(selectedInsight.id, { outcome: outcomeText });
      setMessage({ type: "success", text: "Insight acknowledged" });
      setShowAcknowledgeModal(false);
      setShowDetailModal(false);
      setSelectedInsight(null);
      setOutcomeText("");
      fetchData();
    } catch (err) {
      console.error("Failed to acknowledge:", err);
      setMessage({ type: "error", text: "Failed to acknowledge insight" });
    } finally {
      setAcknowledging(false);
    }
  };

  const totalPages = data ? Math.ceil(data.count / 25) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Business Insights</h1>
        <p className="text-muted-foreground">
          AI-generated insights and recommendations
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
            value={typeFilter}
            onValueChange={(v) => {
              setTypeFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {Object.entries(INSIGHT_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Select
          value={acknowledgedFilter}
          onValueChange={(v) => {
            setAcknowledgedFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="false">Unacknowledged</SelectItem>
            <SelectItem value="true">Acknowledged</SelectItem>
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
            <Lightbulb className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No insights found</p>
            <p className="text-muted-foreground">
              Insights will appear here when the AI generates them
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((insight) => (
                  <TableRow key={insight.id}>
                    <TableCell>
                      {INSIGHT_ICONS[insight.insight_type]}
                    </TableCell>
                    <TableCell className="font-medium max-w-[300px] truncate">
                      {insight.title}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={INSIGHT_TYPE_COLORS[insight.insight_type]}
                        variant="secondary"
                      >
                        {insight.insight_type_display}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{insight.priority}</span>
                        <span className="text-muted-foreground">/10</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {insight.is_acknowledged ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <Check className="mr-1 h-3 w-3" />
                          Reviewed
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(insight.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewInsight(insight.id)}
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
              Showing {data.results.length} of {data.count} insights
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
            <>
              <DialogHeader>
                <DialogTitle>Loading Insight...</DialogTitle>
              </DialogHeader>
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            </>
          ) : selectedInsight ? (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  {INSIGHT_ICONS[selectedInsight.insight_type]}
                  <DialogTitle>{selectedInsight.title}</DialogTitle>
                </div>
                <DialogDescription className="flex items-center gap-2">
                  <Badge
                    className={INSIGHT_TYPE_COLORS[selectedInsight.insight_type]}
                    variant="secondary"
                  >
                    {selectedInsight.insight_type_display}
                  </Badge>
                  <span>Priority: {selectedInsight.priority}/10</span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Description */}
                <div>
                  <h4 className="font-medium mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedInsight.description}
                  </p>
                </div>

                {/* Recommended Action */}
                {selectedInsight.recommended_action && (
                  <div>
                    <h4 className="font-medium mb-1">Recommended Action</h4>
                    <p className="text-sm bg-blue-50 text-blue-800 p-3 rounded">
                      {selectedInsight.recommended_action}
                    </p>
                  </div>
                )}

                {/* Supporting Data */}
                {Object.keys(selectedInsight.supporting_data).length > 0 && (
                  <div>
                    <h4 className="font-medium mb-1">Supporting Data</h4>
                    <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                      {JSON.stringify(selectedInsight.supporting_data, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Acknowledgment Info */}
                {selectedInsight.is_acknowledged && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-1 flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Acknowledged
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      By {selectedInsight.acknowledged_by_name} on{" "}
                      {selectedInsight.acknowledged_at &&
                        format(new Date(selectedInsight.acknowledged_at), "MMM d, yyyy HH:mm")}
                    </p>
                    {selectedInsight.outcome && (
                      <p className="text-sm mt-2">
                        <strong>Outcome:</strong> {selectedInsight.outcome}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter>
                {!selectedInsight.is_acknowledged && (
                  <Button onClick={() => setShowAcknowledgeModal(true)}>
                    <Check className="mr-2 h-4 w-4" />
                    Acknowledge
                  </Button>
                )}
              </DialogFooter>
            </>
          ) : (
            <DialogHeader>
              <DialogTitle>Insight Details</DialogTitle>
            </DialogHeader>
          )}
        </DialogContent>
      </Dialog>

      {/* Acknowledge Modal */}
      <Dialog open={showAcknowledgeModal} onOpenChange={setShowAcknowledgeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acknowledge Insight</DialogTitle>
            <DialogDescription>
              Mark this insight as reviewed. Optionally describe any action taken.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="outcome">Action Taken (optional)</Label>
            <Textarea
              id="outcome"
              value={outcomeText}
              onChange={(e) => setOutcomeText(e.target.value)}
              placeholder="What action was taken based on this insight?"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAcknowledgeModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAcknowledge} disabled={acknowledging}>
              {acknowledging ? "Saving..." : "Acknowledge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
