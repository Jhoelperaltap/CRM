"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { WidgetWrapper } from "@/components/dashboard/widget-wrapper";

interface TaskByUser { user_id: string | null; user_name: string; total: number; overdue: number; }
interface Props { data: TaskByUser[]; }

export function TasksByUser({ data }: Props) {
  return (
    <WidgetWrapper title="Tasks by User">
      {data.length === 0 ? (
        <p className="text-muted-foreground py-4 text-center text-sm">No open tasks</p>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="user_name" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total" />
            <Bar dataKey="overdue" fill="#ef4444" radius={[4, 4, 0, 0]} name="Overdue" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </WidgetWrapper>
  );
}
