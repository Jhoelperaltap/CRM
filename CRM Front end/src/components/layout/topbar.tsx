"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationBell } from "@/components/layout/notification-bell";
import { UserMenu } from "@/components/layout/user-menu";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

export function Topbar() {
  const toggleMobileMenu = useUIStore((state) => state.toggleSidebar);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 shrink-0 items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      )}
    >
      <div className="flex w-full items-center gap-4 px-4 md:px-6">
        {/* Left section: mobile menu toggle + title */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={toggleMobileMenu}
            aria-label="Toggle mobile menu"
          >
            <Menu className="size-5" />
          </Button>

          <div className="hidden lg:flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">EJFLOW</span>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Ebenezer Tax Services</span>
            </div>
          </div>
        </div>

        {/* Center section: global search */}
        <div className="flex flex-1 items-center justify-center px-2 md:px-8">
          <div className="w-full max-w-md">
            <GlobalSearch />
          </div>
        </div>

        {/* Right section: notifications + user menu */}
        <div className="flex items-center gap-2">
          <NotificationBell />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
