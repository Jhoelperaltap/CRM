"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { getEmailSyncLogs } from "@/lib/api/emails";
import { EmailSyncLog } from "@/types/email";

export default function EmailLogsPage() {
  const [logs, setLogs] = useState<EmailSyncLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEmailSyncLogs()
      .then((data) => setLogs(data.results))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Email Sync Logs</h1>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : logs.length === 0 ? (
        <p className="text-muted-foreground">No sync logs yet.</p>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">Account</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Fetched</th>
                <th className="px-4 py-2 text-left font-medium">Started</th>
                <th className="px-4 py-2 text-left font-medium">Completed</th>
                <th className="px-4 py-2 text-left font-medium">Error</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b">
                  <td className="px-4 py-2">{log.account_name}</td>
                  <td className="px-4 py-2">
                    <Badge variant={log.status === "success" ? "default" : "destructive"}>
                      {log.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">{log.messages_fetched}</td>
                  <td className="px-4 py-2">{new Date(log.started_at).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    {log.completed_at ? new Date(log.completed_at).toLocaleString() : "\u2014"}
                  </td>
                  <td className="px-4 py-2 max-w-xs truncate text-muted-foreground">
                    {log.error_message || "\u2014"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
