import * as path from "path";
import { generateFineTuningDataset } from "../packages/ai-engine/dist/training/export-dataset.js";

const outputPath = path.resolve(process.cwd(), "packages/ai-engine/data/speedpilot-finetune.jsonl");
generateFineTuningDataset(outputPath);
console.log(`[SpeedPilot Training Exporter] Successfully exported fine-tuning dataset to: ${outputPath}`);
