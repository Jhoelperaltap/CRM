"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { slaApi } from "@/lib/api/sla";

const slaFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  is_active: z.boolean(),
  is_default: z.boolean(),
  response_time_urgent: z.number().min(0.1, "Must be at least 0.1 hours"),
  response_time_high: z.number().min(0.1, "Must be at least 0.1 hours"),
  response_time_medium: z.number().min(0.1, "Must be at least 0.1 hours"),
  response_time_low: z.number().min(0.1, "Must be at least 0.1 hours"),
  resolution_time_urgent: z.number().min(0.1, "Must be at least 0.1 hours"),
  resolution_time_high: z.number().min(0.1, "Must be at least 0.1 hours"),
  resolution_time_medium: z.number().min(0.1, "Must be at least 0.1 hours"),
  resolution_time_low: z.number().min(0.1, "Must be at least 0.1 hours"),
  use_business_hours: z.boolean(),
  escalation_enabled: z.boolean(),
  escalation_notify_assignee: z.boolean(),
  escalation_notify_manager: z.boolean(),
  escalation_email: z.string().email().optional().or(z.literal("")),
});

type SLAFormValues = z.infer<typeof slaFormSchema>;

const defaultValues: SLAFormValues = {
  name: "",
  description: "",
  is_active: true,
  is_default: false,
  response_time_urgent: 1,
  response_time_high: 4,
  response_time_medium: 8,
  response_time_low: 24,
  resolution_time_urgent: 4,
  resolution_time_high: 24,
  resolution_time_medium: 48,
  resolution_time_low: 72,
  use_business_hours: true,
  escalation_enabled: true,
  escalation_notify_assignee: true,
  escalation_notify_manager: true,
  escalation_email: "",
};

export default function NewSLAPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<SLAFormValues>({
    resolver: zodResolver(slaFormSchema),
    defaultValues,
  });

  const onSubmit = async (data: SLAFormValues) => {
    setLoading(true);
    setError(null);
    try {
      await slaApi.create({
        ...data,
        escalation_email: data.escalation_email || undefined,
      });
      router.push("/settings/sla");
    } catch (err) {
      console.error("Failed to create SLA:", err);
      setError("Failed to create SLA. Please try again.");
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
          onClick={() => router.push("/settings/sla")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New SLA</h1>
          <p className="text-muted-foreground">
            Create a new Service Level Agreement
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Configure the name and status of this SLA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Standard SLA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe when this SLA should be applied..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-8">
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">Active</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_default"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Set as Default
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="use_business_hours"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Use Business Hours
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Response Time Targets</CardTitle>
              <CardDescription>
                Set the expected first response time by priority (in hours)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="response_time_urgent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-red-600">Urgent</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.5" {...field} />
                      </FormControl>
                      <FormDescription>hours</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="response_time_high"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-orange-600">High</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.5" {...field} />
                      </FormControl>
                      <FormDescription>hours</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="response_time_medium"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-yellow-600">Medium</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.5" {...field} />
                      </FormControl>
                      <FormDescription>hours</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="response_time_low"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-green-600">Low</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.5" {...field} />
                      </FormControl>
                      <FormDescription>hours</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resolution Time Targets</CardTitle>
              <CardDescription>
                Set the expected case resolution time by priority (in hours)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="resolution_time_urgent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-red-600">Urgent</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.5" {...field} />
                      </FormControl>
                      <FormDescription>hours</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="resolution_time_high"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-orange-600">High</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.5" {...field} />
                      </FormControl>
                      <FormDescription>hours</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="resolution_time_medium"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-yellow-600">Medium</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.5" {...field} />
                      </FormControl>
                      <FormDescription>hours</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="resolution_time_low"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-green-600">Low</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.5" {...field} />
                      </FormControl>
                      <FormDescription>hours</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Escalation Settings</CardTitle>
              <CardDescription>
                Configure who gets notified when SLAs are breached
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="escalation_enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Enable Escalation Notifications
                    </FormLabel>
                  </FormItem>
                )}
              />

              <div className="flex gap-8 pl-6">
                <FormField
                  control={form.control}
                  name="escalation_notify_assignee"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={!form.watch("escalation_enabled")}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Notify Assignee
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="escalation_notify_manager"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={!form.watch("escalation_enabled")}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Notify Manager
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="escalation_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Escalation Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="escalation@company.com"
                        {...field}
                        disabled={!form.watch("escalation_enabled")}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional email address to receive all escalation
                      notifications
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/settings/sla")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="mr-2 size-4" />
              {loading ? "Creating..." : "Create SLA"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
