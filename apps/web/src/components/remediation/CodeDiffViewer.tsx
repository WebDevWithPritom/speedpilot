"use client";

import React, { useState } from "react";
import {
  GitCommit,
  Copy,
  Check,
  Download,
  Terminal,
  FileCode2,
  GitBranch,
  Split,
  FileText,
  Sparkles,
} from "lucide-react";

interface CodeDiffViewerProps {
  issueTitle: string;
  issueKey?: string;
  detectedStack?: string;
  rawSnippet?: string;
  url: string;
  evidenceUrl?: string;
  potentialSavings?: string;
}

export function CodeDiffViewer({
  issueTitle,
  issueKey = "",
  detectedStack = "NEXT_JS",
  rawSnippet = "",
  url,
  evidenceUrl,
  potentialSavings,
}: CodeDiffViewerProps) {
  const [activeTab, setActiveTab] = useState<"visual" | "patch" | "pr">("visual");
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  // Prioritize real AI / stack-tailored snippet over generic examples
  const getDiffData = () => {
    const cleanSnippet = (rawSnippet || "").trim();
    if (cleanSnippet.length > 10) {
      const targetHint =
        detectedStack === "WORDPRESS" || detectedStack === "WOOCOMMERCE"
          ? "wp-content/themes/your-theme/functions.php"
          : detectedStack === "SHOPIFY"
          ? "layout/theme.liquid"
          : detectedStack === "NEXTJS" || detectedStack === "NEXT_JS"
          ? "app/layout.tsx (or page component)"
          : "index.html / component";

      const flaggedLine = evidenceUrl
        ? `<!-- Flagged asset: ${evidenceUrl} -->\n<!-- Issue: ${issueTitle} -->`
        : `<!-- Issue on ${url}: ${issueTitle} -->`;

      const patchLines = cleanSnippet
        .split("\n")
        .map((line) => `+ ${line}`)
        .join("\n");

      return {
        fileTarget: targetHint,
        before: `// Current behavior flagged by Google Lighthouse\n${flaggedLine}\n// ${potentialSavings || "Blocks or delays fast page load"}`,
        after: cleanSnippet,
        unifiedPatch: `--- a/${targetHint}\n+++ b/${targetHint}\n@@ -1,2 +1,${cleanSnippet.split("\n").length} @@\n-// ${flaggedLine}\n${patchLines}`,
      };
    }

    const titleLower = issueTitle.toLowerCase();
    const isImage = titleLower.includes("image") || titleLower.includes("paint") || titleLower.includes("lcp");
    const isFont = titleLower.includes("font") || titleLower.includes("display");
    const isScript = titleLower.includes("script") || titleLower.includes("javascript") || titleLower.includes("render-blocking");
    const isCls = titleLower.includes("shift") || titleLower.includes("layout") || titleLower.includes("cls");

    if (isImage) {
      return {
        fileTarget: "components/HeroSection.tsx",
        before: `// ❌ Unoptimized HTML img tag causing high LCP delay & uncompressed payload
export function HeroBanner() {
  return (
    <div className="hero-wrapper">
      <img
        src="/assets/hero-banner.jpg"
        alt="Featured Product"
        className="w-full object-cover"
      />
    </div>
  );
}`,
        after: `// ✅ Optimized Next.js Image with fetchpriority="high", responsive sizes & AVIF/WebP
import Image from "next/image";

export function HeroBanner() {
  return (
    <div className="hero-wrapper relative aspect-[16/9]">
      <Image
        src="/assets/hero-banner.jpg"
        alt="Featured Product"
        priority
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
        className="object-cover"
      />
    </div>
  );
}`,
        unifiedPatch: `--- a/components/HeroSection.tsx
+++ b/components/HeroSection.tsx
@@ -1,10 +1,13 @@
+// Optimized via SpeedPilot AI Remediation Pipeline
+import Image from "next/image";
+
 export function HeroBanner() {
   return (
-    <div className="hero-wrapper">
-      <img
-        src="/assets/hero-banner.jpg"
-        alt="Featured Product"
-        className="w-full object-cover"
-      />
+    <div className="hero-wrapper relative aspect-[16/9]">
+      <Image
+        src="/assets/hero-banner.jpg"
+        alt="Featured Product"
+        priority
+        fill
+        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
+        className="object-cover"
+      />
     </div>
   );
 }`
      };
    }

    if (isFont) {
      return {
        fileTarget: "app/layout.tsx",
        before: `// ❌ Render-blocking Google font link tag in HTML head
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=block"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}`,
        after: `// ✅ Self-hosted next/font/google with zero layout shift & variable font preload
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}`,
        unifiedPatch: `--- a/app/layout.tsx
+++ b/app/layout.tsx
@@ -1,11 +1,14 @@
+import { Inter } from "next/font/google";
+
+const inter = Inter({
+  subsets: ["latin"],
+  display: "swap",
+  variable: "--font-inter",
+});
+
 export default function RootLayout({ children }: { children: React.ReactNode }) {
   return (
-    <html lang="en">
-      <head>
-        <link
-          rel="stylesheet"
-          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=block"
-        />
-      </head>
-      <body>{children}</body>
+    <html lang="en" className={inter.variable}>
+      <body className="font-sans antialiased">{children}</body>
     </html>
   );
 }`
      };
    }

    if (isScript) {
      return {
        fileTarget: "components/AnalyticsProvider.tsx",
        before: `// ❌ Synchronous heavy script freezing main thread during critical boot
export function Analytics() {
  return (
    <script
      src="https://static.hotjar.com/c/hotjar-123456.js?sv=6"
      async
    />
  );
}`,
        after: `// ✅ Next.js Script component with lazyOnload strategy deferred until idle
import Script from "next/script";

export function Analytics() {
  return (
    <Script
      src="https://static.hotjar.com/c/hotjar-123456.js?sv=6"
      strategy="lazyOnload"
      onLoad={() => console.log("Analytics initialized in idle frame")}
    />
  );
}`,
        unifiedPatch: `--- a/components/AnalyticsProvider.tsx
+++ b/components/AnalyticsProvider.tsx
@@ -1,7 +1,9 @@
+import Script from "next/script";
+
 export function Analytics() {
   return (
-    <script
-      src="https://static.hotjar.com/c/hotjar-123456.js?sv=6"
-      async
+    <Script
+      src="https://static.hotjar.com/c/hotjar-123456.js?sv=6"
+      strategy="lazyOnload"
     />
   );
 }`
      };
    }

    if (isCls) {
      return {
        fileTarget: "components/BannerPromo.tsx",
        before: `// ❌ Unreserved container height causing Cumulative Layout Shift (CLS)
export function PromoBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="promo-box">
      {children}
    </div>
  );
}`,
        after: `// ✅ Explicit aspect-ratio & min-height reservation to prevent layout shift
export function PromoBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="promo-box min-h-[56px] aspect-auto sm:min-h-[48px] contain-paint">
      {children}
    </div>
  );
}`,
        unifiedPatch: `--- a/components/BannerPromo.tsx
+++ b/components/BannerPromo.tsx
@@ -1,6 +1,6 @@
 export function PromoBanner({ children }: { children: React.ReactNode }) {
   return (
-    <div className="promo-box">
+    <div className="promo-box min-h-[56px] aspect-auto sm:min-h-[48px] contain-paint">
       {children}
     </div>
   );
 }`
      };
    }

    // Default fallback patch
    return {
      fileTarget: "src/OptimizationPatch.tsx",
      before: `// ❌ Current unoptimized implementation\n${rawSnippet.split("// Code Example:")[0] || "// Synchronous resource loading"}`,
      after: `// ✅ SpeedPilot AI Optimized Implementation\n${rawSnippet || "// Defer non-critical execution"}`,
      unifiedPatch: `--- a/src/App.tsx
+++ b/src/App.tsx
@@ -10,6 +10,10 @@
+// SpeedPilot Performance Patch: ${issueTitle}
+${rawSnippet || "+ // Apply modern asynchronous asset strategy"}
`
    };
  };

  const diffData = getDiffData();

  // Generate GitHub / GitLab PR Description Template
  const prTemplate = `## 🚀 Performance Remediation: ${issueTitle}

### 📊 Audit Summary & Impact
* **Target URL:** \`${url}\`
* **Detected Tech Stack:** \`${detectedStack}\`
* **Potential Savings:** ${potentialSavings || "Core Web Vitals Pass Improvement"}
* **Diagnostic Finding:** ${issueTitle}

### 🛠️ Changes Implemented
\`\`\`diff
${diffData.unifiedPatch}
\`\`\`

### ✅ Verification Steps
1. Apply the patch: \`git apply speedpilot-fix.patch\`
2. Run Lighthouse verification: \`npx lighthouse-ci collect --url="${url}"\`
3. Verify Core Web Vitals threshold (LCP < 2.5s, TBT < 200ms, CLS < 0.1).

*Generated by [SpeedPilot AI](https://github.com/speedpilot)*`;

  const downloadPatchFile = () => {
    const element = document.createElement("a");
    const file = new Blob([diffData.unifiedPatch], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    const cleanName = issueTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
    element.download = `speedpilot-${cleanName}.patch`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs space-y-0">
      {/* Diff Header Toolbar */}
      <div className="p-3 bg-secondary/40 border-b border-border flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background border border-border text-xs font-mono font-semibold text-foreground">
            <FileCode2 className="w-3.5 h-3.5 text-primary" />
            <span>{diffData.fileTarget}</span>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
            Unified Patch Studio
          </span>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-1 bg-background p-1 rounded-lg border border-border text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("visual")}
            className={`px-2.5 py-1 rounded-md transition font-medium flex items-center gap-1.5 cursor-pointer ${
              activeTab === "visual"
                ? "bg-secondary text-foreground font-semibold shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Split className="w-3 h-3" />
            <span>Before / After</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("patch")}
            className={`px-2.5 py-1 rounded-md transition font-medium flex items-center gap-1.5 cursor-pointer ${
              activeTab === "patch"
                ? "bg-secondary text-foreground font-semibold shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <GitCommit className="w-3 h-3" />
            <span>Git Diff (.patch)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pr")}
            className={`px-2.5 py-1 rounded-md transition font-medium flex items-center gap-1.5 cursor-pointer ${
              activeTab === "pr"
                ? "bg-secondary text-foreground font-semibold shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <GitBranch className="w-3 h-3" />
            <span>PR Template</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Visual Side-by-Side Diff */}
      {activeTab === "visual" && (
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border font-mono text-xs">
          {/* Before Column */}
          <div className="p-4 bg-rose-500/5 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <span>−</span> Before (Unoptimized)
              </span>
              <span className="text-[10px] font-mono opacity-80">Slow LCP / TBT</span>
            </div>
            <pre className="p-3 rounded-lg bg-zinc-950 text-rose-200 overflow-x-auto leading-relaxed border border-rose-950/40 text-[11px]">
              <code>{diffData.before}</code>
            </pre>
          </div>

          {/* After Column */}
          <div className="p-4 bg-emerald-500/5 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <span>+</span> After (SpeedPilot Optimized)
              </span>
              <span className="text-[10px] font-mono opacity-80">CWV Passing</span>
            </div>
            <pre className="p-3 rounded-lg bg-zinc-950 text-emerald-200 overflow-x-auto leading-relaxed border border-emerald-950/40 text-[11px]">
              <code>{diffData.after}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Tab 2: Unified Git Diff */}
      {activeTab === "patch" && (
        <div className="p-4 space-y-3 bg-zinc-950">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              Standard Git Patch Format (compatible with &quot;git apply&quot;)
            </span>
          </div>
          <pre className="p-3.5 rounded-lg bg-zinc-900 text-zinc-100 font-mono text-xs overflow-x-auto leading-relaxed border border-zinc-800">
            <code>
              {diffData.unifiedPatch.split("\n").map((line, i) => (
                <div
                  key={i}
                  className={
                    line.startsWith("+")
                      ? "text-emerald-400 bg-emerald-950/30 -mx-3.5 px-3.5"
                      : line.startsWith("-")
                      ? "text-rose-400 bg-rose-950/30 -mx-3.5 px-3.5"
                      : line.startsWith("@@")
                      ? "text-blue-400"
                      : "text-zinc-300"
                  }
                >
                  {line}
                </div>
              ))}
            </code>
          </pre>
        </div>
      )}

      {/* Tab 3: PR Story & Markdown Template */}
      {activeTab === "pr" && (
        <div className="p-4 space-y-3 bg-card">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">
              Ready-to-Paste Pull Request / Linear Description
            </span>
            <span className="text-[11px] text-muted-foreground">Markdown formatted</span>
          </div>
          <pre className="p-3.5 rounded-lg bg-secondary/50 font-mono text-xs text-foreground overflow-x-auto whitespace-pre-wrap leading-relaxed border border-border">
            <code>{prTemplate}</code>
          </pre>
        </div>
      )}

      {/* Actions Footer Bar */}
      <div className="p-3 bg-secondary/20 border-t border-border flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={downloadPatchFile}
            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-[0.98]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .patch File</span>
          </button>

          <button
            type="button"
            onClick={() => copyToClipboard(diffData.unifiedPatch, "patch")}
            className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-semibold border border-border transition flex items-center gap-1.5 cursor-pointer"
          >
            {copiedType === "patch" ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>Patch Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Git Diff</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => copyToClipboard(prTemplate, "pr")}
            className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-semibold border border-border transition flex items-center gap-1.5 cursor-pointer"
          >
            {copiedType === "pr" ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>PR Markdown Copied!</span>
              </>
            ) : (
              <>
                <FileText className="w-3.5 h-3.5" />
                <span>Copy PR Story</span>
              </>
            )}
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
          <span>Apply with:</span>
          <code className="bg-background px-1.5 py-0.5 rounded border border-border text-foreground">
            git apply speedpilot-*.patch
          </code>
        </div>
      </div>
    </div>
  );
}

