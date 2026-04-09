import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";
import { BrandingProvider } from "@/lib/branding-context";
import { AppProviders } from "@/lib/i18n-context";
import { getSchoolBranding, getSchoolBrandingMeta } from "@/lib/school-branding-server";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  weight: ["400", "600", "700"],
});

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const b = await getSchoolBrandingMeta();
  const appleShort = b.schoolName.length > 17 ? `${b.schoolName.slice(0, 16)}…` : b.schoolName;
  return {
    title: { default: b.schoolName, template: `%s | ${b.schoolName}` },
    description: `Jadwal, murid, dan pelatih — ${b.schoolName}`,
    appleWebApp: { capable: true, title: appleShort, statusBarStyle: "default" },
    other: {
      "mobile-web-app-capable": "yes",
    },
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
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const branding = await getSchoolBranding();
  const role = (cookies().get("pss_role")?.value === "coach" ? "coach" : "admin") as "admin" | "coach";

  return (
    <html lang="id" className={fontSans.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className={`${fontSans.className} min-h-[100dvh] antialiased`}>
        <RegisterServiceWorker />
        <AppProviders>
          <BrandingProvider initial={branding}>
            <AppShell initialRole={role}>{children}</AppShell>
          </BrandingProvider>
        </AppProviders>
      </body>
    </html>
  );
}
