"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  Users,
  Building2,
  Briefcase,
  ClipboardList,
  Calendar,
  CalendarDays,
  FileText,
  CheckSquare,
  BarChart3,
  ScrollText,
  Settings,
  Mail,
  Bell,
  PieChart,
  Ticket,
  TrendingUp,
  Target,
  CalendarCheck,
  Zap,
  FileSignature,
  Boxes,
  Bot,
  ChevronRight,
  Home,
  Search,
  HelpCircle,
  X,
  User,
  Shield,
  Database,
  Workflow,
  Key,
  FolderTree,
  Palette,
  type LucideIcon,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import { HelpAssistantDialog } from "@/components/help/help-assistant-dialog";

interface MenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
  iconColor?: string;
  description?: string;
}

interface MenuCategory {
  title: string;
  items: MenuItem[];
}

interface MegaMenuGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  iconColor?: string;
  href?: string;
  categories: MenuCategory[];
  condition?: () => boolean;
}

export function MegaMenuSidebar() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const uiMode = useUIStore((state) => state.uiMode);
  const mobileMenuOpen = !useUIStore((state) => state.sidebarCollapsed);
  const toggleMobileMenu = useUIStore((state) => state.toggleSidebar);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Define mega menu structure
  const megaMenuGroups: MegaMenuGroup[] = [
    {
      id: "home",
      label: "Home",
      icon: Home,
      iconColor: "text-sky-400",
      href: "/dashboard",
      categories: [],
    },
    {
      id: "crm",
      label: "CRM",
      icon: Users,
      iconColor: "text-cyan-400",
      categories: [
        {
          title: "CONTACTS",
          items: [
            { label: "All Contacts", href: "/contacts", icon: Users, iconColor: "text-cyan-400", description: "Manage individual contacts" },
            // Hide Corporations in Light Mode - companies are created through contact wizard
            ...(uiMode !== "light" ? [{ label: "Corporations", href: "/corporations", icon: Building2, iconColor: "text-slate-400", description: "Business entities" }] : []),
            { label: "Import Contacts", href: "/contacts/import", icon: Users, iconColor: "text-cyan-400", description: "Import from CSV" },
          ],
        },
        {
          title: "SALES",
          items: [
            { label: "Cases", href: "/cases", icon: Briefcase, iconColor: "text-amber-400", description: "Tax cases & matters" },
            { label: "Quotes", href: "/quotes", icon: ClipboardList, iconColor: "text-violet-400", description: "Price quotes" },
          ],
        },
      ],
    },
    {
      id: "office",
      label: "Office",
      icon: Mail,
      iconColor: "text-rose-400",
      categories: [
        {
          title: "COMMUNICATION",
          items: [
            { label: "Inbox", href: "/inbox", icon: Mail, iconColor: "text-rose-400", description: "Email messages" },
            { label: "Notifications", href: "/notifications", icon: Bell, iconColor: "text-yellow-400", description: "System alerts" },
            { label: "Internal Tickets", href: "/internal-tickets", icon: Ticket, iconColor: "text-orange-400", description: "Support tickets" },
          ],
        },
        {
          title: "SCHEDULING",
          items: [
            { label: "Appointments", href: "/appointments", icon: Calendar, iconColor: "text-teal-400", description: "All appointments" },
            { label: "Calendar", href: "/appointments/calendar", icon: CalendarDays, iconColor: "text-cyan-400", description: "Calendar view" },
            { label: "Appointment Pages", href: "/appointment-pages", icon: CalendarCheck, iconColor: "text-teal-400", description: "Booking pages" },
          ],
        },
        {
          title: "DOCUMENTS",
          items: [
            { label: "Documents", href: "/documents", icon: FileText, iconColor: "text-yellow-400", description: "File management" },
            { label: "E-Sign Documents", href: "/esign-documents", icon: FileSignature, iconColor: "text-emerald-400", description: "Digital signatures" },
          ],
        },
        {
          title: "PRODUCTIVITY",
          items: [
            { label: "Tasks", href: "/tasks", icon: CheckSquare, iconColor: "text-green-400", description: "To-do items" },
            { label: "Actions", href: "/actions", icon: Zap, iconColor: "text-amber-400", description: "Quick actions" },
          ],
        },
      ],
    },
    {
      id: "inventory",
      label: "Inventory",
      icon: Boxes,
      iconColor: "text-indigo-400",
      categories: [
        {
          title: "INVENTORY MANAGEMENT",
          items: [
            { label: "Inventory", href: "/inventory", icon: Boxes, iconColor: "text-indigo-400", description: "Stock management" },
          ],
        },
      ],
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: BarChart3,
      iconColor: "text-purple-400",
      categories: [
        {
          title: "DASHBOARDS",
          items: [
            { label: "Dashboard", href: "/dashboard", icon: BarChart3, iconColor: "text-sky-400", description: "Overview metrics" },
            { label: "AI Agent", href: "/ai-agent", icon: Bot, iconColor: "text-purple-400", description: "AI-powered insights" },
          ],
        },
        {
          title: "INSIGHTS",
          items: [
            { label: "Sales Insights", href: "/sales-insights", icon: TrendingUp, iconColor: "text-emerald-400", description: "Revenue analytics" },
            { label: "Forecast & Quota", href: "/forecasts", icon: Target, iconColor: "text-red-400", description: "Projections" },
            { label: "Reports", href: "/reports", icon: PieChart, iconColor: "text-purple-400", description: "Custom reports" },
          ],
        },
      ],
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      iconColor: "text-slate-400",
      categories: [
        {
          title: "GENERAL",
          items: [
            { label: "Profile", href: "/settings/profile", icon: User, iconColor: "text-blue-400", description: "Your profile settings" },
            { label: "Appearance", href: "/settings/appearance", icon: Palette, iconColor: "text-pink-400", description: "Theme & display" },
          ],
        },
        {
          title: "USER MANAGEMENT",
          items: [
            { label: "Users", href: "/settings/users", icon: Users, iconColor: "text-cyan-400", description: "Manage users" },
            { label: "Roles", href: "/settings/roles", icon: Shield, iconColor: "text-amber-400", description: "Permissions" },
            { label: "Departments", href: "/settings/departments", icon: FolderTree, iconColor: "text-green-400", description: "Organization structure" },
          ],
        },
        {
          title: "SYSTEM",
          items: [
            { label: "Modules", href: "/settings/modules", icon: Database, iconColor: "text-indigo-400", description: "Module settings" },
            { label: "Workflows", href: "/settings/workflows", icon: Workflow, iconColor: "text-orange-400", description: "Automation rules" },
            { label: "API Keys", href: "/settings/api-keys", icon: Key, iconColor: "text-slate-400", description: "API access" },
            { label: "Audit Log", href: "/audit", icon: ScrollText, iconColor: "text-indigo-400", description: "Activity history" },
          ],
        },
      ],
      condition: () => user?.role?.slug === "admin",
    },
  ];

  // Filter groups based on conditions
  const visibleGroups = megaMenuGroups.filter(
    (group) => !group.condition || group.condition()
  );

  // Check if a menu item or any of its children is active
  const isItemActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const isGroupActive = (group: MegaMenuGroup) => {
    if (group.href && isItemActive(group.href)) return true;
    return group.categories.some((cat) =>
      cat.items.some((item) => isItemActive(item.href))
    );
  };

  // Handle mouse enter with delay
  const handleMouseEnter = (groupId: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setActiveMenu(groupId);
  };

  // Handle mouse leave with delay
  const handleMouseLeave = () => {
    if (isPinned) return;
    timeoutRef.current = setTimeout(() => {
      setActiveMenu(null);
    }, 150);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        setActiveMenu(null);
        setIsPinned(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Get active group for flyout
  const activeGroup = visibleGroups.find((g) => g.id === activeMenu);

  // Close mobile menu when navigating
  useEffect(() => {
    if (mobileMenuOpen) {
      toggleMobileMenu();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 flex flex-col lg:hidden",
          "bg-gradient-to-b from-[#1e5a99] via-[#336daa] to-[#4887bf]",
          "border-r border-white/10",
          "transition-transform duration-300 ease-in-out",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Mobile header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold text-lg shadow-lg">
              EJ
            </div>
            <span className="text-white font-semibold">EJFLOW</span>
          </div>
          <button
            onClick={toggleMobileMenu}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Mobile navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          {visibleGroups.map((group) => (
            <div key={group.id} className="mb-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-2 px-2">
                {group.label}
              </h3>
              {group.categories.length === 0 && group.href ? (
                <Link
                  href={group.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    "hover:bg-white/10",
                    isItemActive(group.href)
                      ? "bg-white/15 text-white"
                      : "text-white/70"
                  )}
                >
                  <group.icon className={cn("size-5", group.iconColor)} />
                  <span>{group.label}</span>
                </Link>
              ) : (
                <div className="space-y-1">
                  {group.categories.map((cat) =>
                    cat.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                          "hover:bg-white/10",
                          isItemActive(item.href)
                            ? "bg-white/15 text-white"
                            : "text-white/70"
                        )}
                      >
                        <item.icon className={cn("size-5", item.iconColor)} />
                        <span>{item.label}</span>
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>

      {/* Desktop: Narrow icon sidebar */}
      <div ref={sidebarRef} className="hidden lg:flex h-screen">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex flex-col w-[68px]",
            "bg-gradient-to-b from-[#1e5a99] via-[#336daa] to-[#4887bf]",
            "border-r border-white/10"
          )}
        >
        {/* Logo */}
        <div className="flex h-16 items-center justify-center border-b border-white/10">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25">
            EJ
          </div>
        </div>

        {/* Navigation icons */}
        <nav className="flex-1 flex flex-col gap-1 p-2 overflow-y-auto">
          {visibleGroups.map((group) => {
            const Icon = group.icon;
            const isActive = isGroupActive(group);
            const isHovered = activeMenu === group.id;

            // If group has no categories, render as direct link
            if (group.categories.length === 0 && group.href) {
              return (
                <Link
                  key={group.id}
                  href={group.href}
                  className={cn(
                    "group relative flex flex-col items-center justify-center rounded-xl p-2 transition-all duration-200",
                    "hover:bg-white/10",
                    isActive && "bg-white/15"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-5 transition-all duration-200",
                      isActive ? "text-white" : group.iconColor || "text-white/70",
                      "group-hover:scale-110"
                    )}
                  />
                  <span
                    className={cn(
                      "mt-1 text-[10px] font-medium transition-colors",
                      isActive ? "text-white" : "text-white/60"
                    )}
                  >
                    {group.label}
                  </span>
                </Link>
              );
            }

            return (
              <button
                key={group.id}
                onMouseEnter={() => handleMouseEnter(group.id)}
                onClick={() => {
                  if (activeMenu === group.id) {
                    setIsPinned(!isPinned);
                  } else {
                    setActiveMenu(group.id);
                    setIsPinned(true);
                  }
                }}
                className={cn(
                  "group relative flex flex-col items-center justify-center rounded-xl p-2 transition-all duration-200",
                  "hover:bg-white/10",
                  (isActive || isHovered) && "bg-white/15"
                )}
              >
                <Icon
                  className={cn(
                    "size-5 transition-all duration-200",
                    isActive || isHovered
                      ? "text-white"
                      : group.iconColor || "text-white/70",
                    "group-hover:scale-110"
                  )}
                />
                <span
                  className={cn(
                    "mt-1 text-[10px] font-medium transition-colors",
                    isActive || isHovered ? "text-white" : "text-white/60"
                  )}
                >
                  {group.label}
                </span>
                {/* Active indicator */}
                {(isActive || isHovered) && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-blue-400 rounded-r-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="flex flex-col gap-1 p-2 border-t border-white/10">
          <button className="group flex flex-col items-center justify-center rounded-xl p-2 transition-all hover:bg-white/10">
            <Search className="size-5 text-white/70 group-hover:text-white transition-colors" />
            <span className="mt-1 text-[10px] font-medium text-white/60">Search</span>
          </button>
          <button
            onClick={() => setHelpOpen(true)}
            className="group flex flex-col items-center justify-center rounded-xl p-2 transition-all hover:bg-white/10"
          >
            <HelpCircle className="size-5 text-white/70 group-hover:text-white transition-colors" />
            <span className="mt-1 text-[10px] font-medium text-white/60">Help</span>
          </button>
        </div>

        {/* Help Assistant Dialog */}
        <HelpAssistantDialog open={helpOpen} onOpenChange={setHelpOpen} />
      </aside>

      {/* Mega menu flyout panel */}
      {activeGroup && activeGroup.categories.length > 0 && (
        <div
          className={cn(
            "fixed top-0 bottom-0 left-[68px] z-40",
            "bg-white dark:bg-slate-900",
            "border-r border-slate-200 dark:border-slate-700",
            "shadow-2xl shadow-black/10 dark:shadow-black/30",
            "animate-in slide-in-from-left-2 fade-in-0 duration-200",
            // Dynamic width based on number of categories
            activeGroup.categories.length <= 2 ? "w-[400px]" : "w-[600px]"
          )}
          onMouseEnter={() => handleMouseEnter(activeGroup.id)}
          onMouseLeave={handleMouseLeave}
        >
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <activeGroup.icon
                className={cn("size-6", activeGroup.iconColor)}
              />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {activeGroup.label}
              </h2>
            </div>
            {isPinned && (
              <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                Pinned
              </span>
            )}
          </div>

          {/* Categories grid */}
          <div className="p-6 overflow-y-auto h-[calc(100vh-4rem)]">
            <div
              className={cn(
                "grid gap-8",
                activeGroup.categories.length <= 2
                  ? "grid-cols-1"
                  : "grid-cols-2"
              )}
            >
              {activeGroup.categories.map((category) => (
                <div key={category.title}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                    {category.title}
                  </h3>
                  <div className="space-y-1">
                    {category.items.map((item) => {
                      const ItemIcon = item.icon;
                      const isActive = isItemActive(item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => {
                            setActiveMenu(null);
                            setIsPinned(false);
                          }}
                          className={cn(
                            "group flex items-start gap-3 rounded-lg p-3 transition-all duration-200",
                            "hover:bg-slate-100 dark:hover:bg-slate-800",
                            isActive && "bg-blue-50 dark:bg-blue-900/20"
                          )}
                        >
                          <div
                            className={cn(
                              "flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg transition-colors",
                              isActive
                                ? "bg-blue-100 dark:bg-blue-900/40"
                                : "bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700"
                            )}
                          >
                            <ItemIcon
                              className={cn(
                                "size-5",
                                isActive ? "text-blue-600 dark:text-blue-400" : item.iconColor
                              )}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "text-sm font-medium transition-colors",
                                  isActive
                                    ? "text-blue-600 dark:text-blue-400"
                                    : "text-slate-900 dark:text-white"
                                )}
                              >
                                {item.label}
                              </span>
                              {isActive && (
                                <ChevronRight className="size-4 text-blue-500" />
                              )}
                            </div>
                            {item.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
