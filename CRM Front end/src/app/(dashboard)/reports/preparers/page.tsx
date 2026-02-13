"use client";

import { useEffect, useState } from "react";
import { getPreparerReport, downloadReportCSV } from "@/lib/api/reports";
import type { PreparerPerformance } from "@/types/reports";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Download } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function PreparerReportPage() {
  const [data, setData] = useState<PreparerPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPreparerReport()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Preparer Performance"
        actions={
          <Button variant="outline" onClick={() => downloadReportCSV("preparers")}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        }
      />

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Cases by Preparer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="preparer_name" type="category" width={120} />
                <Tooltip />
                <Legend />
                <Bar dataKey="assigned" fill="hsl(var(--primary))" name="Assigned" />
                <Bar dataKey="completed" fill="hsl(var(--chart-2))" name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((p, i) => (
              <div key={p.preparer_id} className="flex items-center gap-4">
                <span className="text-lg font-bold text-muted-foreground w-8">
                  #{i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{p.preparer_name}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <Progress value={p.completion_rate} className="flex-1 h-2" />
                    <span className="text-sm text-muted-foreground shrink-0">
                      {p.completion_rate}%
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium">
                    {p.completed}/{p.assigned} cases
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ${p.revenue_actual.toLocaleString()} revenue
                  </p>
                </div>
              </div>
            ))}
            {data.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No preparer data available.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
