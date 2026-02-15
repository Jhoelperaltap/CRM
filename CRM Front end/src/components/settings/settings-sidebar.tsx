"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  Shield,
  Key,
  Globe,
  Share2,
  UserPlus,
  History,
  FileText,
  Eye,
  Mail,
  Mailbox,
  FileCode,
  Activity,
  Bell,
  Workflow,
  ScrollText,
  ClipboardList,
  UserCheck,
  FileCheck,
  MessageSquare,
  ShieldCheck,
  ShieldBan,
  Building,
  Briefcase,
  Blocks,
  Layout,
  List,
  Stamp,
  Languages,
  Receipt,
  FileCheck2,
  BarChart3,
  Clock,
  ExternalLink,
  Bot,
  Brain,
  Timer,
  MessageCircle,
  Phone,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
}

interface SidebarGroup {
  title: string;
  items: SidebarItem[];
}

const groups: SidebarGroup[] = [
  {
    title: "User Management",
    items: [
      { label: "Users", href: "/settings/users", icon: Users, iconColor: "text-blue-500" },
      { label: "Roles", href: "/settings/roles", icon: Shield, iconColor: "text-amber-500" },
      { label: "Profiles", href: "/settings/profiles", icon: Key, iconColor: "text-yellow-600" },
      { label: "Groups", href: "/settings/groups", icon: UserPlus, iconColor: "text-teal-500" },
      { label: "Departments", href: "/settings/departments", icon: Briefcase, iconColor: "text-indigo-500" },
      { label: "Branches", href: "/settings/branches", icon: Building, iconColor: "text-slate-500" },
    ],
  },
  {
    title: "Security",
    items: [
      { label: "Auth Policy", href: "/settings/auth-policy", icon: Key, iconColor: "text-red-500" },
      { label: "Two-Factor Auth", href: "/settings/two-factor", icon: ShieldCheck, iconColor: "text-emerald-500" },
      { label: "IP Whitelist", href: "/settings/ip-whitelist", icon: Globe, iconColor: "text-cyan-500" },
      { label: "Blocked IPs", href: "/settings/blocked-ips", icon: ShieldBan, iconColor: "text-orange-500" },
      { label: "Sharing Rules", href: "/settings/sharing-rules", icon: Share2, iconColor: "text-violet-500" },
    ],
  },
  {
    title: "Portal",
    items: [
      { label: "Accounts", href: "/settings/portal-accounts", icon: UserCheck, iconColor: "text-green-500" },
      { label: "Documents", href: "/settings/portal-documents", icon: FileCheck, iconColor: "text-blue-500" },
      { label: "Messages", href: "/settings/portal-messages", icon: MessageSquare, iconColor: "text-indigo-500" },
      { label: "Live Chat", href: "/settings/live-chat", icon: MessageCircle, iconColor: "text-emerald-500" },
      { label: "Calls", href: "/settings/calls", icon: Phone, iconColor: "text-blue-500" },
      { label: "Video Meetings", href: "/settings/video-meetings", icon: Video, iconColor: "text-cyan-500" },
      { label: "AI Chatbot", href: "/settings/chatbot", icon: Bot, iconColor: "text-purple-500" },
    ],
  },
  {
    title: "Email",
    items: [
      { label: "Email Settings", href: "/settings/email-accounts", icon: Mail, iconColor: "text-rose-500" },
      { label: "Mail Accounts", href: "/settings/mail-accounts", icon: Mailbox, iconColor: "text-sky-500" },
      { label: "Email Templates", href: "/settings/email-templates", icon: FileCode, iconColor: "text-purple-500" },
      { label: "Email Logs", href: "/settings/email-logs", icon: Activity, iconColor: "text-orange-500" },
    ],
  },
  {
    title: "Module Management",
    items: [
      { label: "Modules", href: "/settings/modules", icon: Layout, iconColor: "text-blue-500" },
      { label: "Picklists", href: "/settings/picklists", icon: List, iconColor: "text-teal-500" },
      { label: "Labels Editor", href: "/settings/labels-editor", icon: Languages, iconColor: "text-violet-500" },
    ],
  },
  {
    title: "Automation",
    items: [
      { label: "AI Agent", href: "/settings/ai-agent", icon: Brain, iconColor: "text-purple-600" },
      { label: "Notifications", href: "/settings/notifications", icon: Bell, iconColor: "text-yellow-500" },
      { label: "Workflows", href: "/settings/workflows", icon: Workflow, iconColor: "text-cyan-500" },
      { label: "Workflow Logs", href: "/settings/workflow-logs", icon: ScrollText, iconColor: "text-slate-500" },
      { label: "Checklist Templates", href: "/settings/checklist-templates", icon: ClipboardList, iconColor: "text-green-500" },
      { label: "Approvals", href: "/settings/approvals", icon: Stamp, iconColor: "text-amber-500" },
      { label: "Webforms", href: "/settings/webforms", icon: FileCode, iconColor: "text-indigo-500" },
    ],
  },
  {
    title: "Configuration",
    items: [
      { label: "SLA Management", href: "/settings/sla", icon: Timer, iconColor: "text-rose-500" },
      { label: "Business Hours", href: "/settings/business-hours", icon: Clock, iconColor: "text-orange-500" },
      { label: "Customer Portal", href: "/settings/customer-portal", icon: ExternalLink, iconColor: "text-blue-500" },
    ],
  },
  {
    title: "Inventory Administration",
    items: [
      { label: "Tax Management", href: "/settings/tax-management", icon: Receipt, iconColor: "text-emerald-500" },
      { label: "Terms & Conditions", href: "/settings/terms-conditions", icon: FileCheck2, iconColor: "text-purple-500" },
      { label: "Stock Management", href: "/settings/stock-management", icon: BarChart3, iconColor: "text-blue-500" },
    ],
  },
  {
    title: "Logs",
    items: [
      { label: "Login History", href: "/settings/login-history", icon: History, iconColor: "text-slate-500" },
      { label: "Settings Log", href: "/settings/settings-log", icon: FileText, iconColor: "text-yellow-600" },
      { label: "PII Access Log", href: "/settings/pii-access-log", icon: Eye, iconColor: "text-red-500" },
    ],
  },
];

export function SettingsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r bg-muted/30">
      <div className="sticky top-0 flex flex-col gap-6 p-4">
        <h2 className="text-lg font-semibold">Settings</h2>
        {groups.map((group) => (
          <div key={group.title} className="flex flex-col gap-1">
            <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.title}
            </span>
            {group.items.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    isActive
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  <Icon className={cn("size-4 shrink-0 transition-colors group-hover:opacity-80", item.iconColor)} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}
