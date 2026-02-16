"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { articleApi, categoryApi } from "@/lib/api/knowledge-base";
import type { Category } from "@/types/knowledge-base";

const articleFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  summary: z.string().max(500).optional(),
  content: z.string().min(1, "Content is required"),
  category: z.string().optional(),
  visibility: z.enum(["public", "internal", "portal"]),
  keywords: z.string().optional(),
  is_featured: z.boolean(),
  is_pinned: z.boolean(),
  allow_comments: z.boolean(),
});

type ArticleFormValues = z.infer<typeof articleFormSchema>;

const defaultValues: ArticleFormValues = {
  title: "",
  summary: "",
  content: "",
  category: undefined,
  visibility: "public",
  keywords: "",
  is_featured: false,
  is_pinned: false,
  allow_comments: true,
};

export default function NewArticlePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleFormSchema),
    defaultValues,
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await categoryApi.list({ is_active: true });
        setCategories(data);
      } catch {
        /* empty */
      }
    };
    fetchCategories();
  }, []);

  const onSubmit = async (data: ArticleFormValues, publish: boolean = false) => {
    setLoading(true);
    setError(null);
    try {
      const article = await articleApi.create({
        ...data,
        category: data.category || null,
        status: publish ? "published" : "draft",
      });
      router.push(`/knowledge-base/articles/${article.id}`);
    } catch (err) {
      console.error("Failed to create article:", err);
      setError("Failed to create article. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/knowledge-base/articles")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Article</h1>
          <p className="text-muted-foreground">
            Create a new knowledge base article
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Article Content</CardTitle>
              <CardDescription>
                Write your article content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter article title..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="summary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Summary</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief summary for search results..."
                        {...field}
                        rows={2}
                      />
                    </FormControl>
                    <FormDescription>
                      Max 500 characters. Displayed in search results.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Write your article content here..."
                        {...field}
                        rows={15}
                        className="font-mono"
                      />
                    </FormControl>
                    <FormDescription>
                      Supports Markdown formatting
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="visibility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Visibility</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="public">
                            Public - Visible to all
                          </SelectItem>
                          <SelectItem value="internal">
                            Internal - Staff only
                          </SelectItem>
                          <SelectItem value="portal">
                            Portal - Logged-in users
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="keywords"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Keywords</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="tax, filing, deadline, extension"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Comma-separated keywords for search
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-6">
                <FormField
                  control={form.control}
                  name="is_featured"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">Featured</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_pinned"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">Pinned</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="allow_comments"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Allow Comments
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/knowledge-base/articles")}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={form.handleSubmit((data) => onSubmit(data, false))}
            >
              <Save className="mr-2 size-4" />
              Save as Draft
            </Button>
            <Button
              type="button"
              disabled={loading}
              onClick={form.handleSubmit((data) => onSubmit(data, true))}
            >
              <Send className="mr-2 size-4" />
              {loading ? "Publishing..." : "Publish"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
