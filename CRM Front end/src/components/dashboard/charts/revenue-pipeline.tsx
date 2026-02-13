"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { WidgetWrapper } from "@/components/dashboard/widget-wrapper";

interface Props { data: Array<{ month: string; estimated: number; actual: number }>; }

export function RevenuePipeline({ data }: Props) {
  return (
    <WidgetWrapper title="Revenue Pipeline">
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis />
          <Tooltip formatter={(value) => typeof value === "number" ? `$${value.toLocaleString()}` : value} />
          <Legend />
          <Line type="monotone" dataKey="estimated" stroke="#3b82f6" strokeWidth={2} />
          <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </WidgetWrapper>
  );
}
