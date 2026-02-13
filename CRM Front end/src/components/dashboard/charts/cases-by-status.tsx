"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { WidgetWrapper } from "@/components/dashboard/widget-wrapper";

interface Props { data: Array<{ status: string; count: number }>; }

export function CasesByStatus({ data }: Props) {
  const formatted = data.map((d) => ({
    ...d,
    label: d.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  }));

  return (
    <WidgetWrapper title="Cases by Status">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </WidgetWrapper>
  );
}
