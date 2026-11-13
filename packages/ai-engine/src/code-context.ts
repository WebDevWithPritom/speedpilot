export interface CodeContextInput {
  pastedCode?: string;
  filename?: string;
  githubUrl?: string;
}

export interface ResolvedCodeContext {
  sourceCode?: string;
  sourceFilename?: string;
  sourceOrigin: "PASTED" | "GITHUB" | "NONE";
}

const MAX_CODE_CHARS = 12_000;
const KEY_REPO_FILES = [
  "app/layout.tsx",
  "src/app/layout.tsx",
  "next.config.mjs",
  "next.config.ts",
  "next.config.js",
  "index.html",
  "src/index.html",
  "theme.liquid",
  "layout/theme.liquid",
  "functions.php",
  "package.json",
];

async function fetchTextSafe(url: string): Promise<string | null> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "SpeedPilot-CodeContext/1.0", Accept: "application/vnd.github.v3+json, text/plain, */*" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.slice(0, MAX_CODE_CHARS);
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Resolves optional developer source code from pasted snippet or a public GitHub file/repo URL.
 */
export async function resolveCodeContext(input: CodeContextInput): Promise<ResolvedCodeContext> {
  const pasted = input.pastedCode?.trim();
  if (pasted) {
    return {
      sourceCode: pasted.slice(0, MAX_CODE_CHARS),
      sourceFilename: input.filename?.trim() || "pasted-snippet",
      sourceOrigin: "PASTED",
    };
  }

  const rawUrl = input.githubUrl?.trim();
  if (!rawUrl) return { sourceOrigin: "NONE" };

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { sourceOrigin: "NONE" };
  }

  // Only allow public GitHub HTTPS URLs to prevent SSRF
  if (parsed.protocol !== "https:") return { sourceOrigin: "NONE" };

  if (parsed.hostname === "raw.githubusercontent.com") {
    const code = await fetchTextSafe(rawUrl);
    if (!code) return { sourceOrigin: "NONE" };
    return {
      sourceCode: code,
      sourceFilename: parsed.pathname.split("/").pop() || "github-file",
      sourceOrigin: "GITHUB",
    };
  }

  if (parsed.hostname !== "github.com" && parsed.hostname !== "www.github.com") {
    return { sourceOrigin: "NONE" };
  }

  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return { sourceOrigin: "NONE" };
  const [owner, repoRaw] = parts;
  const repo = repoRaw?.replace(/\.git$/, "");
  if (!owner || !repo) return { sourceOrigin: "NONE" };

  // Direct blob file link: github.com/owner/repo/blob/branch/path/to/file
  if (parts[2] === "blob" && parts.length >= 5) {
    const branch = parts[3];
    const filePath = parts.slice(4).join("/");
    const rawFileUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
    const code = await fetchTextSafe(rawFileUrl);
    if (!code) return { sourceOrigin: "NONE" };
    return { sourceCode: code, sourceFilename: filePath, sourceOrigin: "GITHUB" };
  }

  // Repository root: look up default branch and read up to 2 high-signal config/layout files
  const repoMetaRaw = await fetchTextSafe(`https://api.github.com/repos/${owner}/${repo}`);
  let branch = "main";
  if (repoMetaRaw) {
    try {
      const meta = JSON.parse(repoMetaRaw) as { default_branch?: string };
      if (meta.default_branch) branch = meta.default_branch;
    } catch {
      // Fallback to main
    }
  }

  const collected: string[] = [];
  const names: string[] = [];
  for (const candidate of KEY_REPO_FILES) {
    if (collected.length >= 2) break;
    const text = await fetchTextSafe(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${candidate}`);
    if (text) {
      names.push(candidate);
      collected.push(`// File: ${candidate}\n${text.slice(0, 5000)}`);
    }
  }

  if (collected.length === 0) return { sourceOrigin: "NONE" };
  return {
    sourceCode: collected.join("\n\n").slice(0, MAX_CODE_CHARS),
    sourceFilename: names.join(", "),
    sourceOrigin: "GITHUB",
  };
}

