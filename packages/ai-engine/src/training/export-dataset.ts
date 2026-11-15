import * as fs from "fs";
import * as path from "path";
import { TRAINING_CORPUS } from "./training-corpus.js";

export function generateFineTuningDataset(outputPath?: string): string {
  const systemPrompt = `You are SpeedPilot's Principal Web Performance & Systems Architect.
Given Google PageSpeed Insights (Lighthouse 13) diagnostic evidence, provide audience-tailored recommendations and exact copy-pasteable fixes.
Rules:
1. NEVER output generic or textbook advice (no 'optimize images' or 'clean code' in abstract terms).
2. Every fix MUST contain the EXACT filenames, URLs, CSS selectors, or component names found in the audit evidence.
3. Every code snippet MUST be valid, copy-pasteable code matching the detected tech stack.
4. Output valid JSON matching the exact SpeedPilot AI schema.`;

  const lines: string[] = [];

  for (const exemplar of TRAINING_CORPUS) {
    const userPayload = {
      targetUrl: exemplar.inputDescription.split(" - ")[0]?.replace("Target: ", "") || "https://example.com",
      detectedTechStack: exemplar.techStack,
      flaggedAssets: exemplar.flaggedAssets,
      issue: {
        code: exemplar.issueCode,
        title: exemplar.title,
      },
    };

    const entry = {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Audit Evidence:\n${JSON.stringify(userPayload, null, 2)}` },
        { role: "assistant", content: JSON.stringify(exemplar.goldStandardOutput, null, 2) },
      ],
    };

    lines.push(JSON.stringify(entry));
  }

  const content = lines.join("\n");

  if (outputPath) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, content, "utf-8");
  }

  return content;
}
