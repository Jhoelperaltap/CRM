"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  X,
  GripVertical,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Link,
  Image,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { getUsers } from "@/lib/api/users";
import {
  getActivePortalConfig,
  createPortalConfig,
  updatePortalConfig,
} from "@/lib/api/portal-config";
import type { User } from "@/types/index";
import type { PortalConfiguration } from "@/types/portal-config";
import {
  DEFAULT_MENU_ITEMS,
  DEFAULT_CONTACT_FIELDS,
  DEFAULT_ORG_FIELDS,
  SESSION_TIMEOUT_OPTIONS,
  DEFAULT_SCOPE_OPTIONS,
} from "@/types/portal-config";

/* ------------------------------------------------------------------ */
/*  Local Interfaces                                                   */
/* ------------------------------------------------------------------ */

interface MenuItemRow {
  key: number;
  module_name: string;
  label: string;
  is_enabled: boolean;
  sort_order: number;
}

interface FieldConfigRow {
  key: number;
  module_name: string;
  field_name: string;
  field_label: string;
  permission: "hidden" | "read_only" | "read_write";
  is_mandatory: boolean;
  sort_order: number;
}

interface ShortcutRow {
  key: number;
  shortcut_type: string;
  label: string;
  is_enabled: boolean;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

let nextKey = 1;

export default function CustomerPortalPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  // General Settings
  const [portalUrl, setPortalUrl] = useState("");
  const [defaultAssignee, setDefaultAssignee] = useState("");
  const [supportNotificationDays, setSupportNotificationDays] = useState("");
  const [loginDetailsTemplate, setLoginDetailsTemplate] = useState(
    "Customer Portal Login Link"
  );
  const [forgotPasswordTemplate, setForgotPasswordTemplate] = useState(
    "Customer Portal Forgot Password Reset Link"
  );
  const [customCssUrl, setCustomCssUrl] = useState("");
  const [defaultScope, setDefaultScope] = useState("all");
  const [sessionTimeout, setSessionTimeout] = useState("4");

  // Portal Layout
  const [portalLayoutOpen, setPortalLayoutOpen] = useState(true);
  const [menuItems, setMenuItems] = useState<MenuItemRow[]>([]);
  const [announcementHtml, setAnnouncementHtml] = useState("");
  const [greetingType, setGreetingType] = useState("standard");
  const [shortcuts, setShortcuts] = useState<ShortcutRow[]>([
    { key: nextKey++, shortcut_type: "add_document", label: "Add Document", is_enabled: true },
    { key: nextKey++, shortcut_type: "create_case", label: "Create Case", is_enabled: true },
    { key: nextKey++, shortcut_type: "open_cases", label: "Open Cases", is_enabled: true },
  ]);

  // Widgets
  const [accountRepWidgetEnabled, setAccountRepWidgetEnabled] = useState(false);
  const [recentDocumentsWidgetEnabled, setRecentDocumentsWidgetEnabled] = useState(true);
  const [recentFaqWidgetEnabled, setRecentFaqWidgetEnabled] = useState(true);
  const [recentCasesWidgetEnabled, setRecentCasesWidgetEnabled] = useState(true);

  // Charts
  const [chartOpenCasesPriority, setChartOpenCasesPriority] = useState(true);
  const [chartCasesResolutionTime, setChartCasesResolutionTime] = useState(true);
  const [chartProjectsByStatus, setChartProjectsByStatus] = useState(false);

  // Profile Layout
  const [profileLayoutOpen, setProfileLayoutOpen] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<"contacts" | "organizations">("contacts");
  const [contactFields, setContactFields] = useState<FieldConfigRow[]>([]);
  const [orgFields, setOrgFields] = useState<FieldConfigRow[]>([]);

  // Initialize data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch users
      const usersData = await getUsers();
      setUsers(usersData.results ?? usersData);

      // Try to fetch active config
      try {
        const config = await getActivePortalConfig();
        setConfigId(config.id);
        populateForm(config);
      } catch {
        // No active config, use defaults
        initializeDefaults();
      }
    } catch {
      initializeDefaults();
    } finally {
      setLoading(false);
    }
  }, []);

  const populateForm = (config: PortalConfiguration) => {
    setPortalUrl(config.portal_url || "");
    setDefaultAssignee(config.default_assignee || "");
    setSupportNotificationDays(config.support_notification_days?.toString() || "");
    setLoginDetailsTemplate(config.login_details_template || "Customer Portal Login Link");
    setForgotPasswordTemplate(config.forgot_password_template || "Customer Portal Forgot Password Reset Link");
    setCustomCssUrl(config.custom_css_url || "");
    setDefaultScope(config.default_scope || "all");
    setSessionTimeout(config.session_timeout_hours || "4");
    setAnnouncementHtml(config.announcement_html || "");
    setGreetingType(config.greeting_type || "standard");
    setAccountRepWidgetEnabled(config.account_rep_widget_enabled);
    setRecentDocumentsWidgetEnabled(config.recent_documents_widget_enabled);
    setRecentFaqWidgetEnabled(config.recent_faq_widget_enabled);
    setRecentCasesWidgetEnabled(config.recent_cases_widget_enabled);
    setChartOpenCasesPriority(config.chart_open_cases_priority);
    setChartCasesResolutionTime(config.chart_cases_resolution_time);
    setChartProjectsByStatus(config.chart_projects_by_status);

    // Menu items
    if (config.menu_items?.length) {
      setMenuItems(
        config.menu_items.map((item) => ({
          key: nextKey++,
          module_name: item.module_name,
          label: item.label,
          is_enabled: item.is_enabled,
          sort_order: item.sort_order,
        }))
      );
    } else {
      initializeMenuItems();
    }

    // Field configs
    const contactConfigs = config.field_configs?.filter(
      (f) => f.module_name === "contacts"
    );
    const orgConfigs = config.field_configs?.filter(
      (f) => f.module_name === "organizations"
    );

    if (contactConfigs?.length) {
      setContactFields(
        contactConfigs.map((f) => ({
          key: nextKey++,
          ...f,
        }))
      );
    } else {
      initializeContactFields();
    }

    if (orgConfigs?.length) {
      setOrgFields(
        orgConfigs.map((f) => ({
          key: nextKey++,
          ...f,
        }))
      );
    } else {
      initializeOrgFields();
    }
  };

  const initializeDefaults = () => {
    initializeMenuItems();
    initializeContactFields();
    initializeOrgFields();
  };

  const initializeMenuItems = () => {
    setMenuItems(
      DEFAULT_MENU_ITEMS.map((item, idx) => ({
        key: nextKey++,
        module_name: item.module_name,
        label: item.label,
        is_enabled: item.is_enabled,
        sort_order: idx,
      }))
    );
  };

  const initializeContactFields = () => {
    setContactFields(
      DEFAULT_CONTACT_FIELDS.map((f, idx) => ({
        key: nextKey++,
        module_name: "contacts",
        field_name: f.field_name,
        field_label: f.field_label,
        permission: f.permission,
        is_mandatory: f.is_mandatory,
        sort_order: idx,
      }))
    );
  };

  const initializeOrgFields = () => {
    setOrgFields(
      DEFAULT_ORG_FIELDS.map((f, idx) => ({
        key: nextKey++,
        module_name: "organizations",
        field_name: f.field_name,
        field_label: f.field_label,
        permission: f.permission,
        is_mandatory: f.is_mandatory,
        sort_order: idx,
      }))
    );
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toggle menu item
  const toggleMenuItem = (moduleName: string) => {
    setMenuItems((prev) =>
      prev.map((item) =>
        item.module_name === moduleName
          ? { ...item, is_enabled: !item.is_enabled }
          : item
      )
    );
  };

  // Update field permission
  const updateFieldPermission = (
    moduleName: "contacts" | "organizations",
    fieldName: string,
    permission: "hidden" | "read_only" | "read_write"
  ) => {
    const setter = moduleName === "contacts" ? setContactFields : setOrgFields;
    setter((prev) =>
      prev.map((f) =>
        f.field_name === fieldName ? { ...f, permission } : f
      )
    );
  };

  // Toggle field mandatory
  const toggleFieldMandatory = (
    moduleName: "contacts" | "organizations",
    fieldName: string
  ) => {
    const setter = moduleName === "contacts" ? setContactFields : setOrgFields;
    setter((prev) =>
      prev.map((f) =>
        f.field_name === fieldName ? { ...f, is_mandatory: !f.is_mandatory } : f
      )
    );
  };

  // Save handler
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        portal_url: portalUrl,
        default_assignee: defaultAssignee || null,
        support_notification_days: parseInt(supportNotificationDays) || 7,
        login_details_template: loginDetailsTemplate,
        forgot_password_template: forgotPasswordTemplate,
        custom_css_url: customCssUrl,
        default_scope: defaultScope,
        session_timeout_hours: sessionTimeout,
        announcement_html: announcementHtml,
        greeting_type: greetingType,
        account_rep_widget_enabled: accountRepWidgetEnabled,
        recent_documents_widget_enabled: recentDocumentsWidgetEnabled,
        recent_faq_widget_enabled: recentFaqWidgetEnabled,
        recent_cases_widget_enabled: recentCasesWidgetEnabled,
        chart_open_cases_priority: chartOpenCasesPriority,
        chart_cases_resolution_time: chartCasesResolutionTime,
        chart_projects_by_status: chartProjectsByStatus,
        is_active: true,
        menu_items: menuItems.map((item, idx) => ({
          module_name: item.module_name,
          label: item.label,
          is_enabled: item.is_enabled,
          sort_order: idx,
        })),
        shortcuts: shortcuts.map((s, idx) => ({
          shortcut_type: s.shortcut_type,
          label: s.label,
          custom_url: "",
          is_enabled: s.is_enabled,
          sort_order: idx,
        })),
        field_configs: [
          ...contactFields.map((f, idx) => ({
            module_name: "contacts",
            field_name: f.field_name,
            field_label: f.field_label,
            permission: f.permission,
            is_mandatory: f.is_mandatory,
            sort_order: idx,
          })),
          ...orgFields.map((f, idx) => ({
            module_name: "organizations",
            field_name: f.field_name,
            field_label: f.field_label,
            permission: f.permission,
            is_mandatory: f.is_mandatory,
            sort_order: idx,
          })),
        ],
      };

      if (configId) {
        await updatePortalConfig(configId, payload);
      } else {
        const created = await createPortalConfig(payload);
        setConfigId(created.id);
      }
    } catch {
      /* empty */
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const currentFields = activeProfileTab === "contacts" ? contactFields : orgFields;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <PageHeader title="Customer Portal" />

        <Card>
          <CardContent className="pt-6 space-y-6">
            {/* General Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Portal URL
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="size-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      The public URL where clients access the portal
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  value={portalUrl}
                  onChange={(e) => setPortalUrl(e.target.value)}
                  placeholder="https://yourcompany.com/portal"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Default Assignee
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="size-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Default user assigned to portal submissions
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Select
                  value={defaultAssignee || "__none__"}
                  onValueChange={(v) => setDefaultAssignee(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.first_name} {u.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Contact Support Notification (Days before)
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="size-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Days before expiration to notify support
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  value={supportNotificationDays}
                  onChange={(e) => setSupportNotificationDays(e.target.value)}
                  placeholder="7"
                  type="number"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Login Details Template
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="size-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Email template for login details
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Select
                  value={loginDetailsTemplate}
                  onValueChange={setLoginDetailsTemplate}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Customer Portal Login Link">
                      Customer Portal Login Link
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Forgot Password Template
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="size-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Email template for password reset
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Select
                  value={forgotPasswordTemplate}
                  onValueChange={setForgotPasswordTemplate}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Customer Portal Forgot Password Reset Link">
                      Customer Portal Forgot Password Reset Link
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  CSS URL for custom theme
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="size-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      URL to custom CSS stylesheet
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  value={customCssUrl}
                  onChange={(e) => setCustomCssUrl(e.target.value)}
                  placeholder="https://example.com/custom.css"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Default Scope
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="size-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      What records portal users can see
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Select value={defaultScope} onValueChange={setDefaultScope}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_SCOPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Inactive Portal Session Logout Interval
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="size-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Auto logout after inactivity
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SESSION_TIMEOUT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Portal Layout Section */}
            <Collapsible open={portalLayoutOpen} onOpenChange={setPortalLayoutOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-base font-semibold hover:text-primary w-full py-2">
                {portalLayoutOpen ? (
                  <ChevronDown className="size-5" />
                ) : (
                  <ChevronRight className="size-5" />
                )}
                Portal Layout
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-6 pt-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Portal Menu */}
                  <div className="space-y-3">
                    <h4 className="font-medium">Portal Menu</h4>
                    <div className="rounded-md border max-h-96 overflow-y-auto">
                      {menuItems.map((item) => (
                        <div
                          key={item.key}
                          className="flex items-center gap-2 px-3 py-2 border-b last:border-b-0 hover:bg-muted/30"
                        >
                          <GripVertical className="size-4 text-muted-foreground cursor-grab" />
                          <input
                            type="checkbox"
                            checked={item.is_enabled}
                            onChange={() => toggleMenuItem(item.module_name)}
                            className="accent-primary"
                          />
                          <span className="text-sm">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Portal Home Layout */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Portal Home Layout</h4>

                    {/* Announcement */}
                    <div className="space-y-2">
                      <Label>Announcement</Label>
                      <div className="rounded-md border">
                        <div className="flex items-center gap-1 px-2 py-1 border-b bg-muted/30">
                          <Button variant="ghost" size="icon" className="size-7">
                            <Bold className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-7">
                            <Italic className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-7">
                            <Underline className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-7">
                            <Strikethrough className="size-3.5" />
                          </Button>
                          <div className="w-px h-4 bg-border mx-1" />
                          <Button variant="ghost" size="icon" className="size-7">
                            <List className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-7">
                            <ListOrdered className="size-3.5" />
                          </Button>
                          <div className="w-px h-4 bg-border mx-1" />
                          <Button variant="ghost" size="icon" className="size-7">
                            <Link className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-7">
                            <Image className="size-3.5" />
                          </Button>
                        </div>
                        <Textarea
                          value={announcementHtml}
                          onChange={(e) => setAnnouncementHtml(e.target.value)}
                          className="border-0 rounded-t-none min-h-24"
                          placeholder="Enter announcement text..."
                        />
                      </div>
                    </div>

                    {/* Greeting Widget */}
                    <div className="space-y-2 rounded-md border p-3">
                      <Label>Greeting Widget</Label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={greetingType === "standard"}
                            onChange={() => setGreetingType("standard")}
                            className="accent-primary"
                          />
                          <span className="text-sm">Standard greeting</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={greetingType === "time_based"}
                            onChange={() => setGreetingType("time_based")}
                            className="accent-primary"
                          />
                          <span className="text-sm flex items-center gap-1">
                            Time based greeting
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="size-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                Changes greeting based on time of day
                              </TooltipContent>
                            </Tooltip>
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Charts */}
                    <div className="space-y-2 rounded-md border p-3">
                      <Label>Charts</Label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={chartOpenCasesPriority}
                            onChange={(e) =>
                              setChartOpenCasesPriority(e.target.checked)
                            }
                            className="accent-primary"
                          />
                          <span className="text-sm">Open cases by priority</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={chartCasesResolutionTime}
                            onChange={(e) =>
                              setChartCasesResolutionTime(e.target.checked)
                            }
                            className="accent-primary"
                          />
                          <span className="text-sm">
                            Cases resolution time by priority
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={chartProjectsByStatus}
                            onChange={(e) =>
                              setChartProjectsByStatus(e.target.checked)
                            }
                            className="accent-primary"
                          />
                          <span className="text-sm">Projects By Status</span>
                        </label>
                      </div>
                    </div>

                    {/* Analytics placeholder */}
                    <div className="rounded-md border p-3">
                      <Label>Analytics</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Analytics widgets configuration
                      </p>
                    </div>

                    {/* Recent Cases Widget */}
                    <div className="space-y-2 rounded-md border p-3">
                      <Label>Recent Cases Record Widget</Label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={recentCasesWidgetEnabled}
                          onChange={(e) =>
                            setRecentCasesWidgetEnabled(e.target.checked)
                          }
                          className="accent-primary"
                        />
                        <span className="text-sm">Enable</span>
                      </label>
                    </div>
                  </div>

                  {/* Right Column - Widgets */}
                  <div className="space-y-4">
                    {/* Account Representatives Widget */}
                    <div className="rounded-md border p-3 space-y-2">
                      <Label>Account Representatives Widget</Label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={accountRepWidgetEnabled}
                          onChange={(e) =>
                            setAccountRepWidgetEnabled(e.target.checked)
                          }
                          className="accent-primary"
                        />
                        <span className="text-sm">Enable</span>
                      </label>
                    </div>

                    {/* Shortcuts */}
                    <div className="rounded-md border p-3 space-y-2">
                      <Label>Shortcuts</Label>
                      <div className="space-y-1">
                        {shortcuts.map((s) => (
                          <div key={s.key} className="text-sm py-1">
                            {s.label}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recent Documents Widget */}
                    <div className="rounded-md border p-3 space-y-2">
                      <Label>Recent Documents Record Widget</Label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={recentDocumentsWidgetEnabled}
                          onChange={(e) =>
                            setRecentDocumentsWidgetEnabled(e.target.checked)
                          }
                          className="accent-primary"
                        />
                        <span className="text-sm">Enable</span>
                      </label>
                    </div>

                    {/* Recent FAQ Widget */}
                    <div className="rounded-md border p-3 space-y-2">
                      <Label>Recent Faq Record Widget</Label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={recentFaqWidgetEnabled}
                          onChange={(e) =>
                            setRecentFaqWidgetEnabled(e.target.checked)
                          }
                          className="accent-primary"
                        />
                        <span className="text-sm">Enable</span>
                      </label>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Profile Layout Section */}
            <Collapsible open={profileLayoutOpen} onOpenChange={setProfileLayoutOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-base font-semibold hover:text-primary w-full py-2">
                {profileLayoutOpen ? (
                  <ChevronDown className="size-5" />
                ) : (
                  <ChevronRight className="size-5" />
                )}
                Profile Layout
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  {/* Module Tabs */}
                  <div className="space-y-1">
                    <button
                      onClick={() => setActiveProfileTab("contacts")}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                        activeProfileTab === "contacts"
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                    >
                      Contacts
                    </button>
                    <button
                      onClick={() => setActiveProfileTab("organizations")}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                        activeProfileTab === "organizations"
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                    >
                      Organizations
                    </button>
                  </div>

                  {/* Field Configuration */}
                  <div className="lg:col-span-3 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">
                        {activeProfileTab === "contacts"
                          ? "Contact Fields And Privileges"
                          : "Organization Fields And Privileges"}
                      </h4>
                    </div>

                    {/* Read only / Read and write toggles */}
                    <div className="flex items-center gap-8">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Read only
                        </span>
                        <div className="w-10 h-5 bg-amber-400 rounded-full" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Read and write
                        </span>
                        <div className="w-10 h-5 bg-green-500 rounded-full" />
                      </div>
                    </div>

                    {/* Fields list */}
                    <div className="space-y-2">
                      <Label>
                        Mandatory Fields<span className="text-destructive">*</span>
                      </Label>
                      <div className="space-y-2">
                        {currentFields.map((field) => (
                          <div
                            key={field.key}
                            className="flex items-center gap-3"
                          >
                            <Switch
                              checked={field.permission === "read_write"}
                              onCheckedChange={(checked) =>
                                updateFieldPermission(
                                  activeProfileTab,
                                  field.field_name,
                                  checked ? "read_write" : "read_only"
                                )
                              }
                              className={
                                field.permission === "read_write"
                                  ? "data-[state=checked]:bg-green-500"
                                  : "data-[state=unchecked]:bg-amber-400"
                              }
                            />
                            <GripVertical className="size-4 text-muted-foreground cursor-grab" />
                            <span className="text-sm">
                              {field.field_label}
                              {field.is_mandatory && (
                                <span className="text-destructive">*</span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Add Fields */}
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Add fields"
                        className="max-w-xs"
                        disabled
                      />
                      <Button variant="outline" size="sm" disabled>
                        <Plus className="mr-1 size-3" />
                        Add Fields
                      </Button>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Save Button */}
            <div className="flex justify-center pt-4 border-t">
              <Button onClick={handleSave} disabled={saving} className="px-8">
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
