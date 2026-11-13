#!/usr/bin/env node

/**
 * SpeedPilot CI/CD Performance & SEO Regression Guard
 * CLI & GitHub Action PR Bot Runner
 *
 * Usage:
 *   node scripts/ci-guard.mjs --url=https://preview.myapp.com --pr=42 --sha=abc1234
 */

import https from "node:https";
import http from "node:http";

// Parse CLI flags (--key=value or --flag)
const args = process.argv.slice(2);
const flags = {};

for (const arg of args) {
  if (arg.startsWith("--")) {
    const [key, ...vals] = arg.slice(2).split("=");
    flags[key] = vals.length > 0 ? vals.join("=") : true;
  }
}

const targetUrl = flags.url || process.env.TARGET_URL || flags.target;
const baselineUrl = flags.baseline || process.env.BASELINE_URL;
const prNumber = flags.pr || flags.prNumber || process.env.PR_NUMBER || process.env.GITHUB_PR_NUMBER;
const commitSha = flags.sha || flags.commitSha || process.env.GITHUB_SHA;
const branch = flags.branch || process.env.GITHUB_HEAD_REF || process.env.GIT_BRANCH;
const repo = flags.repo || process.env.GITHUB_REPOSITORY;
const githubToken = flags.token || process.env.GITHUB_TOKEN;
const speedpilotHost =
  flags["speedpilot-url"] || process.env.SPEEDPILOT_URL || "https://speedpilot.webdevwithpritom.com";
const device = (flags.device || "MOBILE").toUpperCase();
const isNonBlocking = Boolean(flags["non-blocking"] || process.env.NON_BLOCKING);

if (!targetUrl) {
  console.error("❌ Error: Missing required flag --url=<preview_url> or TARGET_URL environment variable.");
  process.exit(1);
}

console.log("⚡ [SpeedPilot CI Guard] Starting Core Web Vitals & SEO evaluation...");
console.log(`🎯 Target URL:   ${targetUrl}`);
if (prNumber) console.log(`🔀 Pull Request: #${prNumber} (${repo || "unknown repo"})`);
if (commitSha) console.log(`📌 Commit SHA:   ${commitSha.slice(0, 7)}`);
console.log(`📱 Device Mode:  ${device}`);

async function postJson(endpointUrl, payload, headers = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = endpointUrl.startsWith("https:");
    const client = isHttps ? https : http;
    const urlObj = new URL(endpointUrl);

    const bodyStr = JSON.stringify(payload);
    const req = client.request(
      urlObj,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(bodyStr),
          "User-Agent": "SpeedPilot-CI-Guard/1.0",
          ...headers,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(parsed.error || `HTTP ${res.statusCode}: ${data}`));
            } else {
              resolve(parsed);
            }
          } catch {
            reject(new Error(`Invalid response (HTTP ${res.statusCode}): ${data.slice(0, 300)}`));
          }
        });
      }
    );

    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

async function postGitHubComment(commentBody) {
  if (!githubToken || !repo || !prNumber) {
    console.log("ℹ️  Skipping GitHub PR comment: GITHUB_TOKEN, repo, or PR number not provided.");
    return;
  }

  try {
    console.log(`💬 Publishing scorecard to GitHub PR #${prNumber}...`);
    const commentEndpoint = `https://api.github.com/repos/${repo}/issues/${prNumber}/comments`;

    await postJson(
      commentEndpoint,
      { body: commentBody },
      {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
      }
    );
    console.log("✅ Successfully posted SpeedPilot scorecard to GitHub PR!");
  } catch (err) {
    console.warn("⚠️  Could not post comment to GitHub:", err.message);
  }
}

async function run() {
  try {
    const guardEndpoint = `${speedpilotHost.replace(/\/$/, "")}/api/v1/ci/guard`;

    const payload = {
      url: targetUrl,
      baselineUrl,
      device,
      git: {
        commitSha,
        branch,
        prNumber,
        repo,
      },
    };

    const res = await postJson(guardEndpoint, payload);

    console.log("\n=======================================================");
    console.log(`📊 STATUS: ${res.status} (${res.violationsCount} violations)`);
    console.log("=======================================================");
    console.log(`🚀 Performance:    ${res.scorecard.performanceScore}/100`);
    console.log(`⏱️  LCP Time:       ${res.scorecard.lcpMs}ms (Budget: ≤ ${res.budgets.maxLcpMs}ms)`);
    console.log(`📐 CLS Shift:      ${res.scorecard.cls} (Budget: ≤ ${res.budgets.maxCls})`);
    console.log(`⚡ TBT Time:       ${res.scorecard.tbtMs}ms`);
    console.log(`♿ Accessibility:  ${res.scorecard.accessibilityScore}/100`);
    console.log(`🔍 Technical SEO:  ${res.scorecard.seoScore}/100`);
    console.log(`🤖 Agentic AI:     ${res.scorecard.agenticScore}/100`);
    console.log("=======================================================\n");

    if (res.violations && res.violations.length > 0) {
      console.log("⚠️  Budget Policy Violations:");
      for (const v of res.violations) {
        console.log(`   - [${v.severity}] ${v.metric}: ${v.message}`);
      }
      console.log("");
    }

    // Publish PR Comment
    if (res.markdownComment) {
      await postGitHubComment(res.markdownComment);
    }

    if (!res.isPassed && !isNonBlocking) {
      console.error("❌ SpeedPilot CI Guard: Budget checks failed! Blocking PR merge.");
      process.exit(1);
    } else {
      console.log("✅ SpeedPilot CI Guard: All checks passed or non-blocking mode enabled.");
      process.exit(0);
    }
  } catch (err) {
    console.error("❌ Fatal Error in SpeedPilot CI Guard:", err.message);
    if (!isNonBlocking) {
      process.exit(1);
    }
  }
}

run();

