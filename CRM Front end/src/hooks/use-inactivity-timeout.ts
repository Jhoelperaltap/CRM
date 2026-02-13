"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { logout } from "@/lib/auth";
import { api } from "@/lib/api";

interface AuthPolicy {
  idle_session_timeout_minutes: number;
}

interface UseInactivityTimeoutOptions {
  warningBeforeSeconds?: number; // Show warning X seconds before logout
  onWarning?: (remainingSeconds: number) => void;
  onTimeout?: () => void;
}

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
  "wheel",
];

// Throttle activity updates to avoid excessive processing
const ACTIVITY_THROTTLE_MS = 1000;

export function useInactivityTimeout(options: UseInactivityTimeoutOptions = {}) {
  const {
    warningBeforeSeconds = 60, // 1 minute warning before logout
    onWarning,
    onTimeout,
  } = options;

  const router = useRouter();
  const tokens = useAuthStore((state) => state.tokens);
  const isAuthenticated = !!tokens?.access;

  const [timeoutMinutes, setTimeoutMinutes] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  // eslint-disable-next-line react-hooks/purity
  const lastActivityRef = useRef<number>(Date.now());
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const warningIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const throttleRef = useRef<number>(0);

  // Fetch session timeout setting on mount
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchSessionTimeout = async () => {
      try {
        // Use the public endpoint accessible to all authenticated users
        const response = await api.get<AuthPolicy>("/settings/session-timeout/");
        const minutes = response.data.idle_session_timeout_minutes;
        if (minutes && minutes > 0) {
          setTimeoutMinutes(minutes);
        }
      } catch (error) {
        console.error("Failed to fetch session timeout setting:", error);
        // Default to 240 minutes if fetch fails
        setTimeoutMinutes(240);
      }
    };

    fetchSessionTimeout();
  }, [isAuthenticated]);

  // Handle logout
  const handleTimeout = useCallback(async () => {
    setShowWarning(false);
    setRemainingSeconds(null);

    if (warningIntervalRef.current) {
      clearInterval(warningIntervalRef.current);
      warningIntervalRef.current = null;
    }

    onTimeout?.();
    await logout();
    router.replace("/login?reason=session_timeout");
  }, [onTimeout, router]);

  // Reset activity timer
  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    setRemainingSeconds(null);

    if (warningIntervalRef.current) {
      clearInterval(warningIntervalRef.current);
      warningIntervalRef.current = null;
    }
  }, []);

  // Handle user activity
  const handleActivity = useCallback(() => {
    const now = Date.now();

    // Throttle activity updates
    if (now - throttleRef.current < ACTIVITY_THROTTLE_MS) {
      return;
    }
    throttleRef.current = now;

    resetTimer();
  }, [resetTimer]);

  // Main timeout check loop
  useEffect(() => {
    if (!isAuthenticated || !timeoutMinutes || timeoutMinutes <= 0) {
      return;
    }

    const timeoutMs = timeoutMinutes * 60 * 1000;
    const warningMs = warningBeforeSeconds * 1000;

    const checkTimeout = () => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = timeoutMs - elapsed;

      if (remaining <= 0) {
        // Time's up - logout
        handleTimeout();
      } else if (remaining <= warningMs && !showWarning) {
        // Show warning
        setShowWarning(true);
        setRemainingSeconds(Math.ceil(remaining / 1000));
        onWarning?.(Math.ceil(remaining / 1000));

        // Start countdown interval
        warningIntervalRef.current = setInterval(() => {
          const newRemaining = timeoutMs - (Date.now() - lastActivityRef.current);
          if (newRemaining <= 0) {
            handleTimeout();
          } else {
            const secs = Math.ceil(newRemaining / 1000);
            setRemainingSeconds(secs);
            onWarning?.(secs);
          }
        }, 1000);
      }
    };

    // Check every 10 seconds
    const intervalId = setInterval(checkTimeout, 10000);

    // Initial check
    checkTimeout();

    return () => {
      clearInterval(intervalId);
      if (warningIntervalRef.current) {
        clearInterval(warningIntervalRef.current);
      }
    };
  }, [isAuthenticated, timeoutMinutes, warningBeforeSeconds, showWarning, onWarning, handleTimeout]);

  // Attach activity listeners
  useEffect(() => {
    if (!isAuthenticated || !timeoutMinutes) {
      return;
    }

    // Add event listeners
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Also listen for visibility changes (tab focus)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // When tab becomes visible, check if we should have timed out
        const timeoutMs = timeoutMinutes * 60 * 1000;
        const elapsed = Date.now() - lastActivityRef.current;
        if (elapsed >= timeoutMs) {
          handleTimeout();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAuthenticated, timeoutMinutes, handleActivity, handleTimeout]);

  // Extend session (reset timer from external call)
  const extendSession = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  return {
    showWarning,
    remainingSeconds,
    timeoutMinutes,
    extendSession,
    isActive: isAuthenticated && timeoutMinutes !== null,
  };
}
