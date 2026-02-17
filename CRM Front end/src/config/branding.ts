/**
 * EJFLOW Branding Configuration
 *
 * Platform: EJFLOW (your registered brand)
 * Client: Configurable name for each client installation
 */

export const branding = {
  // Platform branding (your registered trademark)
  platform: {
    name: "EJFLOW",
    shortName: "EJF",
    tagline: "Enterprise CRM Platform",
    logo: {
      text: "EJ",
      gradient: {
        from: "#2563eb", // blue-600
        to: "#1d4ed8", // blue-700
      },
    },
  },

  // Client branding (customizable per installation)
  client: {
    name: "Ebenezer Tax Services",
    shortName: "ETS",
  },

  // Display modes
  display: {
    // Shows: "EJFLOW | Client Name" in topbar
    showPlatformInTopbar: true,
    // Shows: "Powered by EJFLOW" in footer/login
    showPoweredBy: true,
  },

  // Meta information
  meta: {
    title: "EJFLOW CRM",
    description: "Enterprise CRM Platform by EJFLOW",
  },
} as const;

// Helper functions
export function getFullTitle(pageTitle?: string): string {
  if (pageTitle) {
    return `${pageTitle} | ${branding.platform.name}`;
  }
  return `${branding.platform.name} - ${branding.client.name}`;
}

export function getTopbarTitle(): string {
  if (branding.display.showPlatformInTopbar) {
    return `${branding.platform.name} | ${branding.client.name}`;
  }
  return branding.client.name;
}
