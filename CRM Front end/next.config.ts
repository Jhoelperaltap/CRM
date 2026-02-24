import type { NextConfig } from "next";

// Content Security Policy configuration
// Adjust these values based on your deployment environment
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const isDev = process.env.NODE_ENV !== 'production';

// SECURITY: unsafe-eval only allowed in development for hot reload
// Production uses strict CSP without unsafe-eval
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self'${isDev ? " 'unsafe-eval'" : ''} 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https: ${apiUrl};
  font-src 'self' data:;
  connect-src 'self' ${apiUrl} ws: wss:;
  frame-src 'self' ${apiUrl} blob:;
  frame-ancestors 'self';
  base-uri 'self';
  form-action 'self';
  object-src 'self' ${apiUrl} blob:;
`.replace(/\s{2,}/g, ' ').trim();

const nextConfig: NextConfig = {
  // Enable standalone output for Docker production builds
  // This creates a minimal production bundle in .next/standalone
  output: "standalone",

  // Security Headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Content Security Policy - Restricts resource loading
          {
            key: "Content-Security-Policy",
            value: ContentSecurityPolicy,
          },
          // Allow same-origin framing for document preview
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          // Prevent MIME type sniffing
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // XSS protection for older browsers
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          // Control referrer information
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Restrict browser features
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // Force HTTPS in production
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains; preload",
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
