"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  BookOpen,
  FileText,
  FolderTree,
  HelpCircle,
  Eye,
  ThumbsUp,
  Plus,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { kbStatsApi, articleApi, faqApi, kbSearchApi } from "@/lib/api/knowledge-base";
import type { KBStats, ArticleList, FAQ } from "@/types/knowledge-base";

export default function KnowledgeBasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<KBStats | null>(null);
  const [articles, setArticles] = useState<ArticleList[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    articles: ArticleList[];
    faqs: FAQ[];
  } | null>(null);
  const [searching, setSearching] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, articlesData, faqsData] = await Promise.all([
        kbStatsApi.get(),
        articleApi.list({ status: "published" }),
        faqApi.list({ is_active: true }),
      ]);
      setStats(statsData);
      setArticles(articlesData.slice(0, 10));
      setFaqs(faqsData.slice(0, 10));
    } catch (err) {
      console.error("Failed to load knowledge base data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    setSearching(true);
    try {
      const results = await kbSearchApi.search(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Knowledge Base" />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                <FileText className="size-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-xl font-bold">
                  {stats?.published_articles || 0}
                </div>
                <div className="text-xs text-muted-foreground">Published</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900">
                <BookOpen className="size-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="text-xl font-bold">
                  {stats?.draft_articles || 0}
                </div>
                <div className="text-xs text-muted-foreground">Drafts</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900">
                <FolderTree className="size-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-xl font-bold">
                  {stats?.total_categories || 0}
                </div>
                <div className="text-xs text-muted-foreground">Categories</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                <HelpCircle className="size-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-xl font-bold">{stats?.total_faqs || 0}</div>
                <div className="text-xs text-muted-foreground">FAQs</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-cyan-100 dark:bg-cyan-900">
                <Eye className="size-4 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <div className="text-xl font-bold">
                  {stats?.total_views?.toLocaleString() || 0}
                </div>
                <div className="text-xs text-muted-foreground">Views</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-rose-100 dark:bg-rose-900">
                <ThumbsUp className="size-4 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <div className="text-xl font-bold">
                  {stats?.avg_helpfulness ? `${stats.avg_helpfulness}%` : "N/A"}
                </div>
                <div className="text-xs text-muted-foreground">Helpful</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => router.push("/knowledge-base/articles/new")}>
          <Plus className="mr-2 size-4" />
          New Article
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push("/knowledge-base/faqs/new")}
        >
          <Plus className="mr-2 size-4" />
          New FAQ
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push("/knowledge-base/categories")}
        >
          <FolderTree className="mr-2 size-4" />
          Manage Categories
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Knowledge Base</CardTitle>
          <CardDescription>
            Search across all articles and FAQs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search articles and FAQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
              />
            </div>
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? "Searching..." : "Search"}
            </Button>
          </div>

          {searchResults && (
            <div className="mt-4 space-y-4">
              {searchResults.articles.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">
                    Articles ({searchResults.articles.length})
                  </h4>
                  <div className="space-y-2">
                    {searchResults.articles.map((article) => (
                      <div
                        key={article.id}
                        className="p-3 border rounded-lg cursor-pointer hover:bg-accent"
                        onClick={() =>
                          router.push(`/knowledge-base/articles/${article.id}`)
                        }
                      >
                        <div className="font-medium">{article.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {article.summary}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {searchResults.faqs.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">
                    FAQs ({searchResults.faqs.length})
                  </h4>
                  <div className="space-y-2">
                    {searchResults.faqs.map((faq) => (
                      <div
                        key={faq.id}
                        className="p-3 border rounded-lg cursor-pointer hover:bg-accent"
                        onClick={() =>
                          router.push(`/knowledge-base/faqs/${faq.id}`)
                        }
                      >
                        <div className="font-medium">{faq.question}</div>
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          {faq.answer}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {searchResults.articles.length === 0 &&
                searchResults.faqs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No results found for &quot;{searchQuery}&quot;
                  </div>
                )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Tabs */}
      <Tabs defaultValue="articles">
        <TabsList>
          <TabsTrigger value="articles">Recent Articles</TabsTrigger>
          <TabsTrigger value="faqs">FAQs</TabsTrigger>
          <TabsTrigger value="popular">Popular Articles</TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Articles</CardTitle>
                <CardDescription>
                  Latest published articles
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/knowledge-base/articles")}
              >
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {articles.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead>Published</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {articles.map((article) => (
                      <TableRow
                        key={article.id}
                        className="cursor-pointer"
                        onClick={() =>
                          router.push(`/knowledge-base/articles/${article.id}`)
                        }
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {article.title}
                            {article.is_featured && (
                              <Badge variant="default" className="text-xs">
                                Featured
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {article.category_name || "Uncategorized"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              article.status === "published"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {article.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{article.view_count}</TableCell>
                        <TableCell>
                          {article.published_at
                            ? format(
                                new Date(article.published_at),
                                "MMM d, yyyy"
                              )
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No articles yet. Create your first article to get started.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="faqs" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>FAQs</CardTitle>
                <CardDescription>
                  Frequently Asked Questions
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/knowledge-base/faqs")}
              >
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {faqs.length > 0 ? (
                <div className="space-y-3">
                  {faqs.map((faq) => (
                    <div
                      key={faq.id}
                      className="p-4 border rounded-lg cursor-pointer hover:bg-accent"
                      onClick={() =>
                        router.push(`/knowledge-base/faqs/${faq.id}`)
                      }
                    >
                      <div className="font-medium">{faq.question}</div>
                      <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {faq.answer}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {faq.category_name && (
                          <Badge variant="outline">{faq.category_name}</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {faq.view_count} views
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No FAQs yet. Create your first FAQ to get started.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="popular" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Popular Articles</CardTitle>
              <CardDescription>Most viewed articles</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.popular_articles && stats.popular_articles.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead>Helpfulness</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.popular_articles.map((article) => (
                      <TableRow
                        key={article.id}
                        className="cursor-pointer"
                        onClick={() =>
                          router.push(`/knowledge-base/articles/${article.id}`)
                        }
                      >
                        <TableCell className="font-medium">
                          {article.title}
                        </TableCell>
                        <TableCell>
                          {article.category_name || "Uncategorized"}
                        </TableCell>
                        <TableCell>{article.view_count}</TableCell>
                        <TableCell>
                          {article.helpfulness_score !== null
                            ? `${article.helpfulness_score}%`
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No article views yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
