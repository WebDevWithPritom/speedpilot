import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/ui/AppShell";
import { getCurrentUser } from "@/lib/auth";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "SpeedPilot — Universal Website Performance Intelligence",
  description: "Audit, understand, optimize, and improve website performance with real Lighthouse lab diagnostics, CrUX field telemetry, and audience-tailored AI fix suggestions.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try { if (localStorage.getItem("sp_theme") === "dark") { document.documentElement.classList.add("dark"); } else { document.documentElement.classList.remove("dark"); } } catch(e) {}`,
          }}
        />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans min-h-screen bg-background text-foreground flex antialiased`}>
        <AppShell isAuthenticated={Boolean(user)} initialUser={user}>{children}</AppShell>
      </body>
    </html>
  );
}

