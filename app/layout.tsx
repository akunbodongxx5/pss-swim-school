import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { BrandingProvider } from "@/lib/branding-context";
import { AppProviders } from "@/lib/i18n-context";
import { AppShell } from "@/components/AppShell";
import { getSchoolBranding, getSchoolBrandingMeta } from "@/lib/school-branding-server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const b = await getSchoolBrandingMeta();
  const appleShort = b.schoolName.length > 17 ? `${b.schoolName.slice(0, 16)}…` : b.schoolName;
  return {
    title: { default: b.schoolName, template: `%s | ${b.schoolName}` },
    description: `Jadwal, murid, dan pelatih — ${b.schoolName}`,
    appleWebApp: { capable: true, title: appleShort, statusBarStyle: "default" },
    formatDetection: { telephone: false },
    icons: {
      icon: [
        {
          url: `/api/branding-icon?size=192&v=${b.logoVersion}`,
          sizes: "192x192",
          type: "image/png",
        },
        {
          url: `/api/branding-icon?size=512&v=${b.logoVersion}`,
          sizes: "512x512",
          type: "image/png",
        },
      ],
      apple: [
        {
          url: `/api/branding-icon?size=180&v=${b.logoVersion}`,
          sizes: "180x180",
          type: "image/png",
        },
      ],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f0f4fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1222" },
  ],
};

const THEME_BOOT = `
(function(){
  try {
    var t = localStorage.getItem('pss-theme');
    document.documentElement.classList.remove('light','dark');
    if (t === 'dark') document.documentElement.classList.add('dark');
    else if (t === 'light') document.documentElement.classList.add('light');
    var l = localStorage.getItem('pss-locale');
    if (l === 'en' || l === 'id') document.documentElement.lang = l;
  } catch (e) {}
})();`;

const SW_REGISTER = `
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/sw.js').catch(function(){});
}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const branding = await getSchoolBranding();
  const role = (cookies().get("pss_role")?.value === "coach" ? "coach" : "admin") as "admin" | "coach";

  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <script dangerouslySetInnerHTML={{ __html: SW_REGISTER }} />
      </head>
      <body className="min-h-[100dvh] antialiased">
        <AppProviders>
          <BrandingProvider initial={branding}>
            <AppShell initialRole={role}>{children}</AppShell>
          </BrandingProvider>
        </AppProviders>
      </body>
    </html>
  );
}
