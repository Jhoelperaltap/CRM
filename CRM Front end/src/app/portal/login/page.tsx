"use client";

import { PortalLoginForm } from "@/components/portal/portal-login-form";

export default function PortalLoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Gradient Background */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute bottom-20 right-20 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="flex items-center gap-4 mb-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-2xl shadow-2xl shadow-blue-500/30">
              EJ
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">EJFLOW</h1>
              <p className="text-white/60">Client Portal</p>
            </div>
          </div>

          <h2 className="text-4xl font-bold text-white mb-4">
            Welcome to Your
            <span className="block bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Client Portal
            </span>
          </h2>

          <p className="text-lg text-white/70 max-w-md">
            Access your cases, documents, invoices, and more from one secure location.
          </p>

          {/* Features */}
          <div className="mt-12 grid gap-4">
            {[
              { icon: "📋", title: "Track Cases", desc: "Monitor your case progress in real-time" },
              { icon: "📁", title: "Documents", desc: "Securely share and access files" },
              { icon: "💬", title: "Messages", desc: "Communicate directly with your team" },
              { icon: "📊", title: "Billing", desc: "View invoices and manage payments" },
            ].map((feature) => (
              <div
                key={feature.title}
                className="flex items-center gap-4 rounded-xl bg-white/5 backdrop-blur-sm p-4 border border-white/10"
              >
                <span className="text-2xl">{feature.icon}</span>
                <div>
                  <p className="font-medium text-white">{feature.title}</p>
                  <p className="text-sm text-white/60">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-2xl shadow-2xl shadow-blue-500/30 mb-4">
              EJ
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">EJFLOW</h1>
            <p className="text-slate-500 dark:text-slate-400">Client Portal</p>
          </div>

          {/* Login Card */}
          <div className="rounded-2xl border bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome Back</h2>
              <p className="mt-2 text-slate-500 dark:text-slate-400">
                Sign in to access your account
              </p>
            </div>
            <PortalLoginForm />
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Need help? Contact{" "}
            <a href="mailto:support@ejflow.com" className="text-blue-600 hover:underline">
              support@ejflow.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
