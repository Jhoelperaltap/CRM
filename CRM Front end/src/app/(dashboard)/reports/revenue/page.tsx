"use client";

import { useEffect, useState } from "react";
import { getRevenueReport, downloadReportCSV } from "@/lib/api/reports";
import type { RevenueReport } from "@/types/reports";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export default function RevenueReportPage() {
  const [data, setData] = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState("monthly");

  useEffect(() => {
    let cancelled = false;
    getRevenueReport({ group_by: groupBy })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [groupBy]);

  if (loading) return <LoadingSpinner />;
  if (!data) return <div>Failed to load report</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue Report"
        actions={
          <div className="flex items-center gap-3">
            <Select value={groupBy} onValueChange={setGroupBy}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => downloadReportCSV("revenue", { group_by: groupBy })}
            >
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>
        }
      />

      {/* Totals */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Estimated</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${data.totals.estimated.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${data.totals.actual.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.totals.count}</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.rows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value) => typeof value === "number" ? `$${value.toLocaleString()}` : value} />
                <Legend />
                <Bar dataKey="estimated" fill="hsl(var(--primary))" name="Estimated" />
                <Bar dataKey="actual" fill="hsl(var(--chart-2))" name="Actual" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Period</th>
                  <th className="text-right py-2 px-4">Estimated</th>
                  <th className="text-right py-2 px-4">Actual</th>
                  <th className="text-right py-2 px-4">Cases</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.period} className="border-b">
                    <td className="py-2 px-4">{row.period}</td>
                    <td className="text-right py-2 px-4">${row.estimated.toLocaleString()}</td>
                    <td className="text-right py-2 px-4">${row.actual.toLocaleString()}</td>
                    <td className="text-right py-2 px-4">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
