"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  Plus,
  Search,
  MoreHorizontal,
  Send,
  Pause,
  Play,
  Copy,
  Trash2,
  Eye,
  MousePointer,
  Clock,
  CalendarClock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getCampaigns,
  deleteCampaign,
  sendCampaign,
  pauseCampaign,
  resumeCampaign,
  duplicateCampaign,
} from "@/lib/api/marketing";
import type { Campaign, CampaignStatus } from "@/types/marketing";
import { formatDistanceToNow, format } from "date-fns";

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, [statusFilter]);

  async function fetchCampaigns() {
    try {
      setLoading(true);
      const params = statusFilter !== "all" ? { status: statusFilter } : undefined;
      const data = await getCampaigns(params);
      setCampaigns(data);
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);
      console.error("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(id: string) {
    try {
      await sendCampaign(id);
      fetchCampaigns();
    } catch (error) {
      console.error("Failed to send campaign:", error);
    }
  }

  async function handlePause(id: string) {
    try {
      await pauseCampaign(id);
      fetchCampaigns();
    } catch (error) {
      console.error("Failed to pause campaign:", error);
    }
  }

  async function handleResume(id: string) {
    try {
      await resumeCampaign(id);
      fetchCampaigns();
    } catch (error) {
      console.error("Failed to resume campaign:", error);
    }
  }

  async function handleDuplicate(id: string) {
    try {
      const newCampaign = await duplicateCampaign(id);
      router.push(`/marketing/campaigns/${newCampaign.id}`);
    } catch (error) {
      console.error("Failed to duplicate campaign:", error);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteCampaign(deleteId);
      setDeleteId(null);
      fetchCampaigns();
    } catch (error) {
      console.error("Failed to delete campaign:", error);
    }
  }

  const filteredCampaigns = campaigns.filter((campaign) =>
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    campaign.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Campaigns</h1>
          <p className="text-muted-foreground">
            Create and manage your email campaigns
          </p>
        </div>
        <Button asChild>
          <Link href="/marketing/campaigns/new">
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="sending">Sending</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Mail className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No campaigns found</p>
              <p className="text-sm">Create your first campaign to get started</p>
              <Button asChild className="mt-4">
                <Link href="/marketing/campaigns/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Campaign
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Recipients</TableHead>
                  <TableHead className="text-center">Open Rate</TableHead>
                  <TableHead className="text-center">Click Rate</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <Link
                        href={`/marketing/campaigns/${campaign.id}`}
                        className="hover:underline"
                      >
                        <div className="font-medium">{campaign.name}</div>
                        <div className="text-sm text-muted-foreground truncate max-w-[300px]">
                          {campaign.subject}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={campaign.status} />
                    </TableCell>
                    <TableCell className="text-center">
                      {campaign.total_recipients.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Eye className="h-3 w-3 text-muted-foreground" />
                        {campaign.open_rate}%
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <MousePointer className="h-3 w-3 text-muted-foreground" />
                        {campaign.click_rate}%
                      </div>
                    </TableCell>
                    <TableCell>
                      {campaign.sent_at ? (
                        <div className="text-sm">
                          <div>Sent</div>
                          <div className="text-muted-foreground">
                            {formatDistanceToNow(new Date(campaign.sent_at), { addSuffix: true })}
                          </div>
                        </div>
                      ) : campaign.scheduled_at ? (
                        <div className="text-sm">
                          <div className="flex items-center gap-1">
                            <CalendarClock className="h-3 w-3" />
                            Scheduled
                          </div>
                          <div className="text-muted-foreground">
                            {format(new Date(campaign.scheduled_at), "MMM d, h:mm a")}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(campaign.created_at), { addSuffix: true })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/marketing/campaigns/${campaign.id}`}>
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          {campaign.status === "draft" && (
                            <>
                              <DropdownMenuItem asChild>
                                <Link href={`/marketing/campaigns/${campaign.id}/edit`}>
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSend(campaign.id)}>
                                <Send className="mr-2 h-4 w-4" />
                                Send Now
                              </DropdownMenuItem>
                            </>
                          )}
                          {campaign.status === "sending" && (
                            <DropdownMenuItem onClick={() => handlePause(campaign.id)}>
                              <Pause className="mr-2 h-4 w-4" />
                              Pause
                            </DropdownMenuItem>
                          )}
                          {campaign.status === "paused" && (
                            <DropdownMenuItem onClick={() => handleResume(campaign.id)}>
                              <Play className="mr-2 h-4 w-4" />
                              Resume
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleDuplicate(campaign.id)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteId(campaign.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this campaign? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatusBadge({ status }: { status: CampaignStatus }) {
  const styles: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    sending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    sent: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    paused: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };

  const icons: Record<string, React.ReactNode> = {
    sending: <Clock className="h-3 w-3 animate-pulse" />,
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs capitalize ${styles[status]}`}>
      {icons[status]}
      {status}
    </span>
  );
}
