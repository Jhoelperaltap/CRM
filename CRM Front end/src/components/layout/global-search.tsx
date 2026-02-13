"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, Building2, Briefcase, Loader2 } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

interface SearchResult {
  id: string;
  type: "contact" | "corporation" | "case";
  title: string;
  subtitle: string;
}

interface SearchResponse {
  contacts?: Array<{
    id: string;
    full_name: string;
    email: string;
  }>;
  corporations?: Array<{
    id: string;
    name: string;
    entity_type: string;
  }>;
  cases?: Array<{
    id: string;
    case_number: string;
    title: string;
  }>;
}

const typeConfig = {
  contact: {
    icon: Users,
    label: "Contacts",
    path: "/contacts",
  },
  corporation: {
    icon: Building2,
    label: "Corporations",
    path: "/corporations",
  },
  case: {
    icon: Briefcase,
    label: "Cases",
    path: "/cases",
  },
} as const;

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Register Ctrl+K / Cmd+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.get<SearchResponse>("/search/", {
        params: { q: searchQuery },
      });

      const data = response.data;
      const mapped: SearchResult[] = [];

      // Map contacts
      if (data.contacts) {
        data.contacts.forEach((c) => {
          mapped.push({
            id: c.id,
            type: "contact",
            title: c.full_name,
            subtitle: c.email || "",
          });
        });
      }

      // Map corporations
      if (data.corporations) {
        data.corporations.forEach((c) => {
          mapped.push({
            id: c.id,
            type: "corporation",
            title: c.name,
            subtitle: c.entity_type || "",
          });
        });
      }

      // Map cases
      if (data.cases) {
        data.cases.forEach((c) => {
          mapped.push({
            id: c.id,
            type: "case",
            title: c.title,
            subtitle: c.case_number || "",
          });
        });
      }

      setResults(mapped);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        performSearch(value);
      }, 300);
    },
    [performSearch]
  );

  const handleSelect = useCallback(
    (result: SearchResult) => {
      setOpen(false);
      setQuery("");
      setResults([]);

      const config = typeConfig[result.type];
      router.push(`${config.path}/${result.id}`);
    },
    [router]
  );

  // Clear state when dialog closes
  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setQuery("");
      setResults([]);
    }
  }, []);

  // Group results by type
  const contactResults = results.filter((r) => r.type === "contact");
  const corporationResults = results.filter((r) => r.type === "corporation");
  const caseResults = results.filter((r) => r.type === "case");

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground",
          "ring-offset-background transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">Ctrl</span>K
        </kbd>
      </button>

      {/* Search dialog */}
      <CommandDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Global Search"
        description="Search across contacts, corporations, and cases"
      >
        <CommandInput
          placeholder="Search contacts, corporations, cases..."
          value={query}
          onValueChange={handleInputChange}
        />
        <CommandList>
          {isLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && query.length >= 2 && results.length === 0 && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}

          {!isLoading && query.length > 0 && query.length < 2 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Type at least 2 characters to search
            </div>
          )}

          {!isLoading && contactResults.length > 0 && (
            <CommandGroup heading="Contacts">
              {contactResults.map((result) => {
                const Icon = typeConfig[result.type].icon;
                return (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    value={`${result.title} ${result.subtitle}`}
                    onSelect={() => handleSelect(result)}
                    className="cursor-pointer"
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="text-sm">{result.title}</span>
                      {result.subtitle && (
                        <span className="text-xs text-muted-foreground">
                          {result.subtitle}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {!isLoading &&
            contactResults.length > 0 &&
            corporationResults.length > 0 && <CommandSeparator />}

          {!isLoading && corporationResults.length > 0 && (
            <CommandGroup heading="Corporations">
              {corporationResults.map((result) => {
                const Icon = typeConfig[result.type].icon;
                return (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    value={`${result.title} ${result.subtitle}`}
                    onSelect={() => handleSelect(result)}
                    className="cursor-pointer"
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="text-sm">{result.title}</span>
                      {result.subtitle && (
                        <span className="text-xs text-muted-foreground">
                          {result.subtitle}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {!isLoading &&
            (contactResults.length > 0 || corporationResults.length > 0) &&
            caseResults.length > 0 && <CommandSeparator />}

          {!isLoading && caseResults.length > 0 && (
            <CommandGroup heading="Cases">
              {caseResults.map((result) => {
                const Icon = typeConfig[result.type].icon;
                return (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    value={`${result.title} ${result.subtitle}`}
                    onSelect={() => handleSelect(result)}
                    className="cursor-pointer"
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="text-sm">{result.title}</span>
                      {result.subtitle && (
                        <span className="text-xs text-muted-foreground">
                          {result.subtitle}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
