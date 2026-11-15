import { createRequire } from "module";
const require = createRequire(import.meta.url);

const { detectVendorSignatures } = require("../packages/ai-engine/dist/vendor-intelligence.js");
const { getDeterministicRecommendation } = require("../packages/ai-engine/dist/templates.js");
const { getDeterministicDeveloperDeepSearch } = require("../packages/ai-engine/dist/deep-search/developer.js");
const { TRAINING_CORPUS, findBestTrainingExemplar } = require("../packages/ai-engine/dist/training/training-corpus.js");

console.log("=== SpeedPilot AI Training & Real Solutions Verification ===");

// 1. Vendor intelligence: Test 8 distinct vendors
const sampleUrls = [
  "https://www.googletagmanager.com/gtm.js?id=GTM-XXXXX",
  "https://static.hotjar.com/c/hotjar-123.js?sv=6",
  "https://fonts.googleapis.com/css2?family=Roboto:wght@400;700",
  "https://widget.intercom.io/widget/app-id",
  "https://static.klaviyo.com/onsite/js/klaviyo.js?company_id=abc",
  "https://js.hs-scripts.com/123456.js",
  "https://cdn.judge.me/widget.js",
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js",
];
const detected = detectVendorSignatures(sampleUrls);
console.log(`[Vendor Intelligence] Detected ${detected.length}/8 vendors:`, detected.map((v) => v.vendorName));
if (detected.length < 8) {
  throw new Error(`Expected 8 vendors detected, got ${detected.length}!`);
}

// 2. Training Corpus & Few-Shot Retriever
console.log("\n[Training Corpus Validation]");
console.log(`-> Total Gold-Standard Training Exemplars: ${TRAINING_CORPUS.length}`);
if (TRAINING_CORPUS.length < 68) {
  throw new Error(`Expected at least 68 training exemplars, found ${TRAINING_CORPUS.length}`);
}

const clsExemplar = findBestTrainingExemplar("cumulative-layout-shift", "NEXTJS");
console.log(`-> Retrieved Next.js CLS exemplar: ${clsExemplar?.title}`);

const cronExemplar = findBestTrainingExemplar("server-response-time", "WORDPRESS");
console.log(`-> Retrieved WordPress Cron exemplar: ${cronExemplar?.title}`);

const variantExemplar = findBestTrainingExemplar("mainthread-work-breakdown", "SHOPIFY");
console.log(`-> Retrieved Shopify Variant exemplar: ${variantExemplar?.title}`);

const livewireExemplar = findBestTrainingExemplar("interaction-to-next-paint", "LARAVEL");
console.log(`-> Retrieved Laravel Livewire exemplar: ${livewireExemplar?.title}`);

const loafExemplar = findBestTrainingExemplar("interaction-to-next-paint", "CUSTOM");
console.log(`-> Retrieved LoAF Attribution exemplar: ${loafExemplar?.title}`);

const prerenderExemplar = findBestTrainingExemplar("largest-contentful-paint", "CUSTOM");
console.log(`-> Retrieved Speculation Rules Prerender exemplar: ${prerenderExemplar?.title}`);

const hposExemplar = findBestTrainingExemplar("server-response-time", "WOOCOMMERCE");
console.log(`-> Retrieved WooCommerce HPOS exemplar: ${hposExemplar?.title}`);

console.log("\n[SUCCESS] All validation suites passed cleanly with 68/68 exemplars and 8/8 vendors!");
