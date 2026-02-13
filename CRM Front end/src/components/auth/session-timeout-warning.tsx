"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Clock, LogOut } from "lucide-react";
import { logout } from "@/lib/auth";
import { useRouter } from "next/navigation";

interface SessionTimeoutWarningProps {
  open: boolean;
  remainingSeconds: number | null;
  onExtendSession: () => void;
}

export function SessionTimeoutWarning({
  open,
  remainingSeconds,
  onExtendSession,
}: SessionTimeoutWarningProps) {
  const router = useRouter();

  const formatTime = (seconds: number | null): string => {
    if (seconds === null || seconds <= 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleLogoutNow = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <AlertDialogTitle className="text-center text-xl">
            Session Expiring Soon
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Your session will expire due to inactivity in{" "}
            <span className="font-bold text-amber-600 dark:text-amber-400">
              {formatTime(remainingSeconds)}
            </span>
            . Would you like to continue working?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="my-4 rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">
          Any unsaved changes may be lost if you don&apos;t extend your session.
        </div>

        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={handleLogoutNow}
            className="w-full sm:w-auto"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout Now
          </Button>
          <AlertDialogAction
            onClick={onExtendSession}
            className="w-full sm:w-auto"
          >
            Continue Working
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
