"use client";

import { useEffect, useState } from "react";
import { usePortalAuthStore } from "@/stores/portal-auth-store";
import { portalGetMe } from "@/lib/api/portal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Phone, Calendar, Shield } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { PortalAccess } from "@/types/portal";

export default function PortalSettingsPage() {
  const contact = usePortalAuthStore((s) => s.contact);
  const [portalAccess, setPortalAccess] = useState<PortalAccess | null>(null);

  useEffect(() => {
    portalGetMe().then(setPortalAccess).catch(() => {});
  }, []);

  if (!contact) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          My Profile
        </h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          View your account information
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-500" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Name */}
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Full Name
                </p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {contact.first_name} {contact.last_name}
                </p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
                <Mail className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Email Address
                </p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {contact.email}
                </p>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900">
                <Phone className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Phone Number
                </p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {contact.phone || "Not provided"}
                </p>
              </div>
            </div>

            {/* Last Login */}
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
                <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Last Login
                </p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {portalAccess?.last_login
                    ? new Date(portalAccess.last_login).toLocaleString()
                    : "First login"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-500" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium text-slate-900 dark:text-white">
                Change Password
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Update your password to keep your account secure
              </p>
            </div>
            <Link href="/portal/settings/security">
              <Button variant="outline">Change Password</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Contact Support */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-slate-500 dark:text-slate-400">
              Need to update your information?
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
              Contact support at{" "}
              <a
                href="mailto:jhoelp@supportit.com"
                className="text-blue-600 hover:underline"
              >
                jhoelp@supportit.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
