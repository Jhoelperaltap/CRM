"use client";

import { ReactNode } from "react";

export default function InboxLayout({ children }: { children: ReactNode }) {
  return <div className="flex h-full flex-col">{children}</div>;
}
