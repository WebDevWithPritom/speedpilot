export interface VendorMatch {
  vendorName: string;
  category: "ANALYTICS" | "ADVERTISING" | "CHAT" | "MEDIA" | "FONT" | "PAYMENT" | "UTILITY";
  flaggedUrl: string;
  impactDescription: string;
  recommendedRealFix: {
    NEXTJS: string;
    WORDPRESS: string;
    SHOPIFY: string;
    GENERAL: string;
  };
}

interface VendorRule {
  name: string;
  category: VendorMatch["category"];
  pattern: RegExp;
  impact: string;
  fixes: {
    NEXTJS: string;
    WORDPRESS: string;
    SHOPIFY: string;
    GENERAL: string;
  };
}

const VENDOR_RULES: VendorRule[] = [
  {
    name: "Google Tag Manager",
    category: "ANALYTICS",
    pattern: /googletagmanager\.com\/gtm\.js/i,
    impact: "Synchronously compiles container scripts on the main thread, blocking First Contentful Paint and inflating Total Blocking Time (TBT).",
    fixes: {
      NEXTJS: `// In app/layout.tsx using Next.js Google Tag Manager integration:
import { GoogleTagManager } from '@next/third-parties/google';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body>
        {children}
        <GoogleTagManager gtmId="GTM-XXXXXXX" />
      </body>
    </html>
  );
}`,
      WORDPRESS: `// In functions.php: Defer GTM or load on first user interaction
add_filter('script_loader_tag', function($tag, $handle) {
    if (strpos($tag, 'googletagmanager.com/gtm.js') !== false) {
        return str_replace(' src', ' defer src', $tag);
    }
    return $tag;
}, 10, 2);`,
      SHOPIFY: `<!-- In layout/theme.liquid: Wrap GTM in requestIdleCallback or delayed script -->
<script>
  window.addEventListener('scroll', function initGTM() {
    window.removeEventListener('scroll', initGTM);
    var s = document.createElement('script');
    s.src = 'https://www.googletagmanager.com/gtm.js?id=GTM-XXXXXXX';
    s.async = true;
    document.head.appendChild(s);
  }, { once: true, passive: true });
</script>`,
      GENERAL: `<!-- Defer GTM load until after First Contentful Paint or initial user interaction -->
<script>
  function loadGTM() {
    if (window._gtmLoaded) return;
    window._gtmLoaded = true;
    var s = document.createElement('script');
    s.src = 'https://www.googletagmanager.com/gtm.js?id=GTM-XXXXXXX';
    s.async = true;
    document.head.appendChild(s);
  }
  ['scroll', 'keydown', 'pointerdown'].forEach(ev => window.addEventListener(ev, loadGTM, { once: true, passive: true }));
</script>`,
    },
  },
  {
    name: "Google Analytics (GA4 / gtag.js)",
    category: "ANALYTICS",
    pattern: /googletagmanager\.com\/gtag\/js|google-analytics\.com/i,
    impact: "Collects telemetry payloads and executes hit tracking on the critical rendering path.",
    fixes: {
      NEXTJS: `// In app/layout.tsx using Next.js official Google Analytics wrapper:
import { GoogleAnalytics } from '@next/third-parties/google';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <GoogleAnalytics gaId="G-XXXXXXXXXX" />
      </body>
    </html>
  );
}`,
      WORDPRESS: `// Defer Google Analytics script loader in WordPress
add_filter('script_loader_tag', function($tag, $handle) {
    if (strpos($tag, 'gtag/js') !== false) {
        return str_replace(' src', ' async defer src', $tag);
    }
    return $tag;
}, 10, 2);`,
      SHOPIFY: `<!-- Defer gtag loading in Shopify theme.liquid -->
<script async defer src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>`,
      GENERAL: `<!-- Load GA4 asynchronously without blocking page parse -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX', { send_page_view: false });
  // Send pageview after page load
  window.addEventListener('load', () => gtag('event', 'page_view'));
</script>`,
    },
  },
  {
    name: "Meta Pixel (Facebook)",
    category: "ADVERTISING",
    pattern: /connect\.facebook\.net\/.*\/fbevents\.js/i,
    impact: "Downloads tracking runtime and executes DOM observers before first paint, increasing CPU contention.",
    fixes: {
      NEXTJS: `// app/layout.tsx: Use next/script with strategy="lazyOnload"
import Script from 'next/script';

<Script id="facebook-pixel" strategy="lazyOnload">
  {\`
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', 'YOUR_PIXEL_ID');
    fbq('track', 'PageView');
  \`}
</Script>`,
      WORDPRESS: `// Load Meta Pixel on delayed user interaction or wp_footer
add_action('wp_footer', function() {
    ?>
    <script>
      window.addEventListener('pointerdown', function initFB() {
        window.removeEventListener('pointerdown', initFB);
        var s = document.createElement('script');
        s.src = 'https://connect.facebook.net/en_US/fbevents.js';
        s.async = true;
        document.head.appendChild(s);
      }, { once: true, passive: true });
    </script>
    <?php
}, 99);`,
      SHOPIFY: `<!-- Move Meta Pixel script into layout/theme.liquid right before </body> with defer -->
<script defer src="https://connect.facebook.net/en_US/fbevents.js"></script>`,
      GENERAL: `<!-- Offload Meta Pixel to background or execute after user interaction -->
<script>
  function loadMetaPixel() {
    if (window._fbLoaded) return;
    window._fbLoaded = true;
    var s = document.createElement('script');
    s.src = 'https://connect.facebook.net/en_US/fbevents.js';
    s.async = true;
    document.head.appendChild(s);
  }
  window.addEventListener('scroll', loadMetaPixel, { once: true, passive: true });
</script>`,
    },
  },
  {
    name: "YouTube Embed",
    category: "MEDIA",
    pattern: /youtube\.com\/iframe_api|youtube\.com\/embed|youtube-nocookie\.com/i,
    impact: "Standard YouTube iframe loads 500KB+ of scripts, fonts, and stylesheets upfront, blocking the main thread.",
    fixes: {
      NEXTJS: `// Use @justinribeiro/lite-youtube or dynamic facade:
import dynamic from 'next/dynamic';
// In package.json: npm install @justinribeiro/lite-youtube
// In app or component:
import '@justinribeiro/lite-youtube';

export function VideoPlayer({ videoId }: { videoId: string }) {
  return (
    <lite-youtube videoid={videoId} params="controls=1&rel=0" />
  );
}`,
      WORDPRESS: `<!-- Replace heavy YouTube iframe with lite-youtube web component facade -->
<script type="module" src="https://cdn.jsdelivr.net/npm/@justinribeiro/lite-youtube@1/lite-youtube.min.js"></script>
<lite-youtube videoid="VIDEO_ID" style="background-image: url('https://i.ytimg.com/vi/VIDEO_ID/hqdefault.jpg');">
  <a href="https://youtube.com/watch?v=VIDEO_ID" class="lty-playbtn" title="Play Video">
    <span class="lyt-visually-hidden">Play Video</span>
  </a>
</lite-youtube>`,
      SHOPIFY: `<!-- In Shopify product/article Liquid templates: use image facade -->
<div class="video-facade" onclick="this.innerHTML='<iframe src=\\'https://www.youtube-nocookie.com/embed/VIDEO_ID?autoplay=1\\' frameborder=\\'0\\' allowfullscreen></iframe>'">
  <img src="https://i.ytimg.com/vi/VIDEO_ID/hqdefault.jpg" alt="Video thumbnail" loading="lazy">
  <button type="button" class="play-button" aria-label="Play Video">▶</button>
</div>`,
      GENERAL: `<!-- Click-to-load YouTube Facade (saves 600KB+ upfront JS) -->
<div class="video-facade" style="position:relative;cursor:pointer;" onclick="this.innerHTML='<iframe width=\\'100%\\' height=\\'100%\\' src=\\'https://www.youtube.com/embed/VIDEO_ID?autoplay=1\\' allow=\\'autoplay; encrypted-media\\' allowfullscreen></iframe>'">
  <img src="https://i.ytimg.com/vi/VIDEO_ID/maxresdefault.jpg" alt="Video" width="1280" height="720" style="width:100%;height:auto;" loading="lazy">
  <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:48px;">▶</div>
</div>`,
    },
  },
  {
    name: "Intercom / Chat Widget",
    category: "CHAT",
    pattern: /widget\.intercom\.io|js\.intercomcdn\.com|client\.crisp\.chat|static\.zdassets\.com|js\.driftt\.com/i,
    impact: "Customer chat widgets download 800KB-1.5MB of scripts and hold WebSocket connections immediately upon page load.",
    fixes: {
      NEXTJS: `// Render a lightweight CSS button facade and load Intercom only on click:
'use client';
import { useState } from 'react';
import Script from 'next/script';

export function ChatButton() {
  const [loadChat, setLoadChat] = useState(false);

  return (
    <>
      {!loadChat && (
        <button
          onClick={() => setLoadChat(true)}
          className="fixed bottom-4 right-4 z-50 p-3 bg-blue-600 text-white rounded-full shadow-lg"
          aria-label="Open support chat"
        >
          💬 Chat with us
        </button>
      )}
      {loadChat && (
        <Script
          src="https://widget.intercom.io/widget/APP_ID"
          strategy="lazyOnload"
          onLoad={() => window.Intercom && window.Intercom('boot', { app_id: 'APP_ID' })}
        />
      )}
    </>
  );
}`,
      WORDPRESS: `// Load chat widget only when user clicks floating support button
<button id="chat-facade-btn" onclick="initChatWidget()" class="chat-launcher">💬 Help</button>
<script>
  function initChatWidget() {
    document.getElementById('chat-facade-btn').remove();
    var s = document.createElement('script');
    s.src = 'https://widget.intercom.io/widget/APP_ID';
    s.async = true;
    document.head.appendChild(s);
  }
</script>`,
      SHOPIFY: `<!-- Shopify: Delay chat widget until after user scroll or button click -->
<script>
  window.addEventListener('scroll', function loadChatOnScroll() {
    window.removeEventListener('scroll', loadChatOnScroll);
    setTimeout(function() {
      var s = document.createElement('script');
      s.src = 'https://widget.intercom.io/widget/APP_ID';
      s.async = true;
      document.head.appendChild(s);
    }, 2000);
  }, { once: true, passive: true });
</script>`,
      GENERAL: `<!-- Facade Pattern for Customer Chat Widgets -->
<button id="chat-launcher" onclick="launchChat()" aria-label="Support Chat" style="position:fixed;bottom:20px;right:20px;">💬 Support</button>
<script>
  function launchChat() {
    var s = document.createElement('script');
    s.src = 'CHAT_WIDGET_URL';
    s.async = true;
    document.body.appendChild(s);
    document.getElementById('chat-launcher').style.display = 'none';
  }
</script>`,
    },
  },
  {
    name: "Hotjar / Microsoft Clarity (Session Recording)",
    category: "ANALYTICS",
    pattern: /static\.hotjar\.com|www\.clarity\.ms/i,
    impact: "DOM mutation observers and continuous event listeners record every input and mousemove, degrading INP and mobile scrolling.",
    fixes: {
      NEXTJS: `// Next.js: Load Hotjar/Clarity strictly after window idle
import Script from 'next/script';

<Script id="clarity-analytics" strategy="lazyOnload">
  {\`
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "PROJECT_ID");
  \`}
</Script>`,
      WORDPRESS: `// Defer session recording script until 3 seconds after page load
add_action('wp_footer', function() {
    ?>
    <script>
      window.addEventListener('load', function() {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(function() { loadClarity(); }, { timeout: 3000 });
        } else {
          setTimeout(loadClarity, 2500);
        }
      });
      function loadClarity() {
        var s = document.createElement('script');
        s.src = 'https://www.clarity.ms/tag/PROJECT_ID';
        s.async = true;
        document.head.appendChild(s);
      }
    </script>
    <?php
}, 99);`,
      SHOPIFY: `<!-- Defer session recorders until after interaction in theme.liquid -->
<script>
  ['scroll', 'pointerdown'].forEach(function(e) {
    window.addEventListener(e, function initClarity() {
      window.removeEventListener(e, initClarity);
      var s = document.createElement('script');
      s.src = 'https://www.clarity.ms/tag/PROJECT_ID';
      s.async = true;
      document.head.appendChild(s);
    }, { once: true, passive: true });
  });
</script>`,
      GENERAL: `<!-- Delay session recording tool until idle to protect Core Web Vitals INP/FCP -->
<script>
  window.addEventListener('load', function() {
    setTimeout(function() {
      var s = document.createElement('script');
      s.src = 'https://www.clarity.ms/tag/PROJECT_ID';
      s.async = true;
      document.body.appendChild(s);
    }, 3000);
  });
</script>`,
    },
  },
  {
    name: "Google Fonts",
    category: "FONT",
    pattern: /fonts\.googleapis\.com|fonts\.gstatic\.com/i,
    impact: "CSS @import or synchronous link tags cause FOIT (Flash of Invisible Text) and trigger cross-origin DNS/TLS delays.",
    fixes: {
      NEXTJS: `// Next.js: Replace external Google Fonts link with 'next/font' (zero layout shift, zero network round-trip):
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}`,
      WORDPRESS: `// Preconnect to Google Fonts and add display=swap in functions.php
add_action('wp_head', function() {
    echo '<link rel="preconnect" href="https://fonts.googleapis.com">\n';
    echo '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n';
}, 1);

// Ensure all font URLs append &display=swap
add_filter('style_loader_src', function($src) {
    if (strpos($src, 'fonts.googleapis.com') !== false && strpos($src, 'display=swap') === false) {
        $src .= '&display=swap';
    }
    return $src;
});`,
      SHOPIFY: `<!-- In layout/theme.liquid: Preconnect to fonts.gstatic.com -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" media="print" onload="this.media='all'">`,
      GENERAL: `<!-- Fast Modern Google Font Loading (<head>) -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" media="print" onload="this.media='all'">
<noscript>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap">
</noscript>`,
    },
  },
  {
    name: "TikTok Pixel",
    category: "ADVERTISING",
    pattern: /analytics\.tiktok\.com/i,
    impact: "Executes tracking initialization script and third-party network beacon requests before first user interaction.",
    fixes: {
      NEXTJS: `// Next.js: Load TikTok Pixel via next/script with strategy="lazyOnload"
import Script from 'next/script';

<Script id="tiktok-pixel" strategy="lazyOnload">
  {\`
    !function (w, d, t) {
      w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
      ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
      for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
      ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";
      var o=d.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;
      var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
      ttq.load('YOUR_TIKTOK_PIXEL_ID');
      ttq.page();
    }(window, document, 'ttq');
  \`}
</Script>`,
      WORDPRESS: `// Defer TikTok Pixel until after initial DOMContentLoaded
add_action('wp_footer', function() {
    ?>
    <script>
      window.addEventListener('load', function() {
        var s = document.createElement('script');
        s.src = 'https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=YOUR_PIXEL_ID';
        s.async = true;
        document.head.appendChild(s);
      });
    </script>
    <?php
}, 99);`,
      SHOPIFY: `<!-- Defer TikTok Pixel in theme.liquid -->
<script defer src="https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=YOUR_PIXEL_ID"></script>`,
      GENERAL: `<!-- Load TikTok Pixel after user interaction -->
<script>
  window.addEventListener('pointerdown', function initTikTok() {
    window.removeEventListener('pointerdown', initTikTok);
    var s = document.createElement('script');
    s.src = 'https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=YOUR_PIXEL_ID';
    s.async = true;
    document.head.appendChild(s);
  }, { once: true, passive: true });
</script>`,
    },
  },
];

export function detectVendorSignatures(urls: string[]): VendorMatch[] {
  const matches: VendorMatch[] = [];
  const seenVendors = new Set<string>();

  for (const url of urls) {
    if (!url || typeof url !== "string") continue;
    for (const rule of VENDOR_RULES) {
      if (rule.pattern.test(url) && !seenVendors.has(rule.name)) {
        seenVendors.add(rule.name);
        matches.push({
          vendorName: rule.name,
          category: rule.category,
          flaggedUrl: url,
          impactDescription: rule.impact,
          recommendedRealFix: rule.fixes,
        });
      }
    }
  }

  return matches;
}
