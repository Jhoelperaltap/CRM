"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  Brain,
  CheckCircle,
  Clock,
  Lightbulb,
  PlayCircle,
  Settings,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";

import {
  getStatus,
  getPendingActions,
  getUnacknowledgedInsights,
  getPerformanceSummary,
  getRecommendations,
  runAgentCycle,
  runMarketAnalysis,
} from "@/lib/api/ai-agent";
import type {
  AgentStatus,
  AgentActionListItem,
  AgentInsightListItem,
  PerformanceSummary,
  Recommendation,
} from "@/types/ai-agent";
import { ACTION_STATUS_COLORS, INSIGHT_TYPE_COLORS } from "@/types/ai-agent";

export default function AIAgentDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [pendingActions, setPendingActions] = useState<AgentActionListItem[]>([]);
  const [insights, setInsights] = useState<AgentInsightListItem[]>([]);
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [runningCycle, setRunningCycle] = useState(false);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel, handling individual failures gracefully
      const [statusResult, actionsResult, insightsResult, summaryResult, recsResult] = await Promise.allSettled([
        getStatus(),
        getPendingActions({ page: "1" }),
        getUnacknowledgedInsights({ page: "1" }),
        getPerformanceSummary(30),
        getRecommendations(),
      ]);

      // Process results, using defaults for failed requests
      if (statusResult.status === "fulfilled") {
        setStatus(statusResult.value);
      } else {
        console.error("Failed to fetch status:", statusResult.reason);
      }

      if (actionsResult.status === "fulfilled") {
        setPendingActions(actionsResult.value.results.slice(0, 5));
      } else {
        console.error("Failed to fetch actions:", actionsResult.reason);
      }

      if (insightsResult.status === "fulfilled") {
        setInsights(insightsResult.value.results.slice(0, 5));
      } else {
        console.error("Failed to fetch insights:", insightsResult.reason);
      }

      if (summaryResult.status === "fulfilled") {
        setSummary(summaryResult.value);
      } else {
        console.error("Failed to fetch summary:", summaryResult.reason);
      }

      if (recsResult.status === "fulfilled") {
        setRecommendations(recsResult.value);
      } else {
        console.error("Failed to fetch recommendations:", recsResult.reason);
        // Keep empty array as default
      }

      // Show warning if any requests failed
      const failedCount = [statusResult, actionsResult, insightsResult, summaryResult, recsResult]
        .filter(r => r.status === "rejected").length;
      if (failedCount > 0) {
        setMessage({
          type: "error",
          text: `Some data failed to load (${failedCount} request${failedCount > 1 ? 's' : ''} failed)`
        });
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setMessage({ type: "error", text: "Failed to load AI Agent dashboard" });
    } finally {
      setLoading(false);
    }
  }, []);

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

  const handleRunCycle = async () => {
    setRunningCycle(true);
    try {
      const result = await runAgentCycle(true);
      setMessage({ type: "success", text: result.message || "Agent cycle has been queued" });
      // Refresh data after a short delay
      setTimeout(fetchData, 3000);
    } catch (err) {
      console.error("Failed to run cycle:", err);
      setMessage({ type: "error", text: "Failed to start agent cycle" });
    } finally {
      setRunningCycle(false);
    }
  };

  const handleRunAnalysis = async () => {
    setRunningAnalysis(true);
    try {
      const result = await runMarketAnalysis(true);
      setMessage({ type: "success", text: result.message || "Market analysis has been queued" });
      setTimeout(fetchData, 5000);
    } catch (err) {
      console.error("Failed to run analysis:", err);
      setMessage({ type: "error", text: "Failed to start market analysis" });
    } finally {
      setRunningAnalysis(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">AI Agent Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor and control your AI assistant
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/settings/ai-agent">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
          <Button onClick={handleRunCycle} disabled={runningCycle || !status?.is_active}>
            <PlayCircle className="mr-2 h-4 w-4" />
            {runningCycle ? "Running..." : "Run Cycle"}
          </Button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Status Banner */}
      {status && !status.is_active && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <span className="font-medium text-yellow-800">
              AI Agent is currently inactive.
            </span>
            <Button variant="link" asChild className="text-yellow-800">
              <Link href="/settings/ai-agent">Activate in settings</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            {status?.is_active ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-gray-400" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status?.is_active ? "Active" : "Inactive"}
            </div>
            <p className="text-xs text-muted-foreground capitalize">
              Health: {status?.health}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actions Today</CardTitle>
            <Activity className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status?.today_metrics?.total_actions || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {status?.today_metrics?.executed || 0} executed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-5 w-5 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.activity.pending_actions || 0}</div>
            <Link
              href="/ai-agent/actions?status=pending"
              className="text-xs text-primary hover:underline"
            >
              View all
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">30-Day Execution Rate</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.rates?.execution_rate?.toFixed(1) ?? "0"}%
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.total_actions || 0} total actions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Actions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Pending Actions</CardTitle>
              <CardDescription>Actions awaiting your approval</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/ai-agent/actions?status=pending">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {pendingActions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle className="mb-2 h-8 w-8 text-green-500" />
                <p className="text-muted-foreground">No pending actions</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingActions.map((action) => (
                  <div
                    key={action.id}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
                    onClick={() => router.push(`/ai-agent/actions?action=${action.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{action.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {action.action_type_display}
                      </p>
                    </div>
                    <Badge
                      className={ACTION_STATUS_COLORS[action.status]}
                      variant="secondary"
                    >
                      {action.status_display}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Insights */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>New Insights</CardTitle>
              <CardDescription>Business insights requiring attention</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRunAnalysis}
                disabled={runningAnalysis || !status?.is_active}
              >
                <Brain className="mr-2 h-4 w-4" />
                {runningAnalysis ? "Analyzing..." : "Analyze"}
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/ai-agent/insights">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {insights.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Lightbulb className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-muted-foreground">No new insights</p>
              </div>
            ) : (
              <div className="space-y-3">
                {insights.map((insight) => (
                  <div
                    key={insight.id}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
                    onClick={() => router.push(`/ai-agent/insights?insight=${insight.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{insight.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          className={INSIGHT_TYPE_COLORS[insight.insight_type]}
                          variant="secondary"
                        >
                          {insight.insight_type_display}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Priority: {insight.priority}/10
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Recommendations
            </CardTitle>
            <CardDescription>
              Suggestions for improving AI agent performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg border p-4 ${
                    rec.priority === "high"
                      ? "border-red-200 bg-red-50"
                      : rec.priority === "medium"
                      ? "border-yellow-200 bg-yellow-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{rec.title}</h4>
                      <p className="mt-1 text-sm text-muted-foreground">{rec.description}</p>
                      <p className="mt-2 text-sm">
                        <strong>Action:</strong> {rec.action}
                      </p>
                    </div>
                    <Badge
                      variant={rec.priority === "high" ? "destructive" : "secondary"}
                    >
                      {rec.priority}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Stats */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>30-Day Performance</CardTitle>
            <CardDescription>
              {summary.message || "Summary of AI agent activity over the last 30 days"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="text-center">
                <div className="text-3xl font-bold">{summary.total_actions}</div>
                <div className="text-sm text-muted-foreground">Total Actions</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {summary.status_breakdown?.executed ?? 0}
                </div>
                <div className="text-sm text-muted-foreground">Executed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">
                  {summary.status_breakdown?.rejected ?? 0}
                </div>
                <div className="text-sm text-muted-foreground">Rejected</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">
                  {summary.outcomes?.avg_score?.toFixed(2) ?? "N/A"}
                </div>
                <div className="text-sm text-muted-foreground">Avg. Outcome Score</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">
                  {(summary.ai_usage?.total_tokens_used ?? 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Tokens Used</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
