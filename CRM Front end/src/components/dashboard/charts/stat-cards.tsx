"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Building2, Briefcase, FileCheck, DollarSign, TrendingUp } from "lucide-react";

interface Props {
  stats: {
    total_contacts: number;
    total_corporations: number;
    active_cases: number;
    cases_filed_this_month: number;
    total_estimated_revenue: number;
  };
}

export function StatCards({ stats }: Props) {
  const items = [
    {
      label: "Total Contacts",
      value: stats.total_contacts,
      icon: Users,
      gradient: "from-blue-500/20 to-blue-600/10",
      iconColor: "text-blue-600",
      trend: "+12%",
      trendUp: true,
    },
    {
      label: "Corporations",
      value: stats.total_corporations,
      icon: Building2,
      gradient: "from-emerald-500/20 to-emerald-600/10",
      iconColor: "text-emerald-600",
      trend: "+5%",
      trendUp: true,
    },
    {
      label: "Active Cases",
      value: stats.active_cases,
      icon: Briefcase,
      gradient: "from-orange-500/20 to-orange-600/10",
      iconColor: "text-orange-600",
      trend: "+8%",
      trendUp: true,
    },
    {
      label: "Filed This Month",
      value: stats.cases_filed_this_month,
      icon: FileCheck,
      gradient: "from-violet-500/20 to-violet-600/10",
      iconColor: "text-violet-600",
      trend: "+23%",
      trendUp: true,
    },
    {
      label: "Est. Revenue",
      value: `$${stats.total_estimated_revenue.toLocaleString()}`,
      icon: DollarSign,
      gradient: "from-teal-500/20 to-teal-600/10",
      iconColor: "text-teal-600",
      trend: "+15%",
      trendUp: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item) => (
        <Card
          key={item.label}
          className="group overflow-hidden hover:border-primary/20 transition-all duration-300"
        >
          <CardContent className="flex items-start gap-4 pt-6">
            <div
              className={`rounded-xl bg-gradient-to-br ${item.gradient} p-3
                          group-hover:scale-105 transition-transform duration-300`}
            >
              <item.icon className={`h-5 w-5 ${item.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {item.label}
              </p>
              <p className="text-2xl font-semibold tracking-tight">{item.value}</p>
              <div className="flex items-center gap-1 text-xs">
                <TrendingUp className={`h-3 w-3 ${item.trendUp ? 'text-emerald-500' : 'text-red-500'}`} />
                <span className={item.trendUp ? 'text-emerald-600' : 'text-red-600'}>
                  {item.trend}
                </span>
                <span className="text-muted-foreground">vs last month</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
