import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { AppProviders } from "@/lib/i18n-context";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "PSS Swim School",
  description: "Internal swim school schedule and students",
  appleWebApp: { capable: true, title: "PSS Swim", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const role = (cookies().get("pss_role")?.value === "coach" ? "coach" : "admin") as "admin" | "coach";

  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <script dangerouslySetInnerHTML={{ __html: SW_REGISTER }} />
      </head>
      <body className="min-h-[100dvh] antialiased">
        <AppProviders>
          <AppShell initialRole={role}>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
