import * as crypto from "node:crypto";
import { TechStack } from "@speedpilot/shared";

/**
 * Generates an SHA-256 signature hash from an issue code, tech stack, and primary offending asset.
 * Used for deduplicating recommendations and prompt caching across URLs in a workspace.
 */
export function computeIssueSignature(
  issueCode: string,
  techStack: TechStack,
  primaryResource?: string
): string {
  const normalizedResource = primaryResource ? primaryResource.split("?")[0]?.toLowerCase() : "";
  const input = `${issueCode.toLowerCase()}::${techStack}::${normalizedResource}`;
  return crypto.createHash("sha256").update(input).digest("hex");
}

