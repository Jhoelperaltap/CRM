"use client";

import { branding, getVersionString } from "@/config/branding";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const showVersion = branding.display.showVersionInFooter;

  return (
    <footer className="border-t bg-muted/30 px-4 py-3">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>&copy; {currentYear} {branding.platform.name}</span>
          {branding.display.showPoweredBy && (
            <>
              <span className="hidden sm:inline">|</span>
              <span className="hidden sm:inline">{branding.client.name}</span>
            </>
          )}
        </div>

        {showVersion && (
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-muted font-mono text-[10px]">
              {getVersionString()}
            </span>
            {branding.version.environment !== "production" && (
              <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 font-medium text-[10px] uppercase">
                {branding.version.environment}
              </span>
            )}
          </div>
        )}
      </div>
    </footer>
  );
}
