"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationBell } from "@/components/layout/notification-bell";
import { UserMenu } from "@/components/layout/user-menu";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

export function Topbar() {
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 shrink-0 items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      )}
    >
      <div className="flex w-full items-center gap-4 px-4 md:px-6">
        {/* Left section: mobile menu toggle + logo */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <Menu className="size-5" />
          </Button>

          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary">
              <span className="text-sm font-bold text-primary-foreground">
                E
              </span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-semibold leading-tight tracking-tight">
                Ebenezer Tax Services
              </h1>
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
