"use client";

import { PanelLeftClose, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);

  return (
    <>
      {/* Mobile overlay */}
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col",
          "text-sidebar-foreground",
          "border-r border-sidebar-border",
          "transition-all duration-300 ease-in-out",
          // Gradient background matching Ebenezer brand
          "bg-gradient-to-b from-[#1e5a99] via-[#336daa] to-[#4887bf]",
          // Desktop: controlled by collapsed state
          sidebarCollapsed ? "lg:w-[68px]" : "lg:w-64",
          // Mobile: off-screen by default, slide in when not collapsed
          sidebarCollapsed
            ? "-translate-x-full lg:translate-x-0"
            : "w-64 translate-x-0",
          // Allow submenu overflow when collapsed
          sidebarCollapsed && "overflow-visible"
        )}
      >
        {/* Sidebar header with logo */}
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-white/10",
            sidebarCollapsed ? "lg:justify-center lg:px-3" : "px-5"
          )}
        >
          {sidebarCollapsed ? (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-white font-bold text-sm shadow-sm">
              E
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-white font-bold text-sm shadow-sm">
                E
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">
                  Ebenezer CRM
                </span>
                <span className="text-xs text-white/70">
                  Tax Services
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className={cn(
          "flex-1 py-4 px-3",
          sidebarCollapsed ? "overflow-visible" : "overflow-y-auto"
        )}>
          <SidebarNav />
        </div>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden border-t border-white/10 p-3 lg:block">
          <Button
            variant="ghost"
            size={sidebarCollapsed ? "icon" : "default"}
            className={cn(
              "w-full text-white/70 hover:text-white hover:bg-white/10",
              sidebarCollapsed ? "justify-center" : "justify-start gap-2"
            )}
            onClick={toggleSidebar}
            aria-label={
              sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
          >
            {sidebarCollapsed ? (
              <PanelLeft className="size-4" />
            ) : (
              <>
                <PanelLeftClose className="size-4" />
                <span className="text-sm">Collapse</span>
              </>
            )}
          </Button>
        </div>
      </aside>
    </>
  );
}
