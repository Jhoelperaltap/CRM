"use client";

import { SettingsSidebar } from "@/components/settings/settings-sidebar";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 relative">
      <SettingsSidebar />
      <div className="flex-1 overflow-y-auto p-6 ml-0">{children}</div>
    </div>
  );
}
