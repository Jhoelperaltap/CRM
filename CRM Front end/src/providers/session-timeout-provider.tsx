"use client";

import { ReactNode } from "react";
import { useInactivityTimeout } from "@/hooks/use-inactivity-timeout";
import { SessionTimeoutWarning } from "@/components/auth/session-timeout-warning";

interface SessionTimeoutProviderProps {
  children: ReactNode;
}

export function SessionTimeoutProvider({ children }: SessionTimeoutProviderProps) {
  const { showWarning, remainingSeconds, extendSession } = useInactivityTimeout({
    warningBeforeSeconds: 60, // Show warning 1 minute before logout
  });

  return (
    <>
      {children}
      <SessionTimeoutWarning
        open={showWarning}
        remainingSeconds={remainingSeconds}
        onExtendSession={extendSession}
      />
    </>
  );
}
