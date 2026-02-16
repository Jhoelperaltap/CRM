"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Mail,
  Users,
  Zap,
  FileText,
  BarChart3,
  Send,
  Eye,
  MousePointer,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCampaignAnalytics, getCampaigns, getAutomationSequences } from "@/lib/api/marketing";
import type { CampaignAnalytics, Campaign, AutomationSequence } from "@/types/marketing";

export default function MarketingPage() {
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [automations, setAutomations] = useState<AutomationSequence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [analyticsData, campaignsData, automationsData] = await Promise.all([
          getCampaignAnalytics(30),
          getCampaigns(),
          getAutomationSequences(),
        ]);
        setAnalytics(analyticsData);
        setRecentCampaigns(campaignsData.slice(0, 5));
        setAutomations(automationsData);
      } catch (error) {
        console.error("Failed to fetch marketing data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const quickActions = [
    {
      title: "Email Campaigns",
      description: "Create and send email campaigns",
      icon: Mail,
      href: "/marketing/campaigns",
      color: "text-blue-500",
    },
    {
      title: "Email Lists",
      description: "Manage your subscriber lists",
      icon: Users,
      href: "/marketing/lists",
      color: "text-green-500",
    },
    {
      title: "Automations",
      description: "Set up automated sequences",
      icon: Zap,
      href: "/marketing/automations",
      color: "text-purple-500",
    },
    {
      title: "Templates",
      description: "Email templates library",
      icon: FileText,
      href: "/marketing/templates",
      color: "text-orange-500",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marketing</h1>
          <p className="text-muted-foreground">
            Email campaigns, automations, and subscriber management
          </p>
        </div>
        <Button asChild>
          <Link href="/marketing/campaigns/new">
            <Mail className="mr-2 h-4 w-4" />
            New Campaign
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.total_sent.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.avg_open_rate.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics?.total_opened.toLocaleString() || 0} opens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.avg_click_rate.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics?.total_clicked.toLocaleString() || 0} clicks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campaigns</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.total_campaigns || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg bg-accent ${action.color}`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{action.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Campaigns */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Campaigns</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/marketing/campaigns">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentCampaigns.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Mail className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>No campaigns yet</p>
                <Button variant="link" asChild className="mt-2">
                  <Link href="/marketing/campaigns/new">Create your first campaign</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentCampaigns.map((campaign) => (
                  <Link
                    key={campaign.id}
                    href={`/marketing/campaigns/${campaign.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{campaign.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {campaign.status === "sent"
                          ? `${campaign.open_rate}% open rate`
                          : campaign.status}
                      </p>
                    </div>
                    <StatusBadge status={campaign.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Automations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Automations</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/marketing/automations">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {automations.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Zap className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>No automations yet</p>
                <Button variant="link" asChild className="mt-2">
                  <Link href="/marketing/automations/new">Create an automation</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {automations.slice(0, 5).map((automation) => (
                  <Link
                    key={automation.id}
                    href={`/marketing/automations/${automation.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{automation.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {automation.total_enrolled} enrolled
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs ${
                      automation.is_active
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    }`}>
                      {automation.is_active ? "Active" : "Inactive"}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    sending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    sent: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    paused: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs capitalize ${styles[status] || styles.draft}`}>
      {status}
    </span>
  );
}
