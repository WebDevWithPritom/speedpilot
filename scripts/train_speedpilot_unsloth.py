#!/usr/bin/env python3
"""
SpeedPilot AI - Production Fine-Tuning Pipeline using Unsloth (GitHub: unslothai/unsloth)
------------------------------------------------------------------------------------------
Fine-tunes open-weights code models for 100% free on Google Colab T4 or local GPU.
Trained on 60+ gold-standard SpeedPilot performance remediation pairs.

Recommended Models:
  1. "unsloth/Qwen2.5-Coder-7B-Instruct" (Top coding performance, fits free T4 GPU)
  2. "unsloth/Llama-3.2-3B-Instruct"    (Ultra-lightweight, 3.2B parameters, super fast)
  3. "unsloth/DeepSeek-R1-Distill-Qwen-7B" (Advanced reasoning and architectural diffs)

Run locally / Colab:
  pip install --no-deps "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
  pip install --no-deps "xformers<0.0.27" trl peft accelerate bitsandbytes
  python scripts/train_speedpilot_unsloth.py
"""

import os
import sys
import argparse
import json
import torch

def parse_args():
    parser = argparse.ArgumentParser(description="SpeedPilot AI Fine-Tuning with Unsloth")
    parser.add_argument(
        "--model",
        type=str,
        default="unsloth/Qwen2.5-Coder-7B-Instruct",
        help="Base model from Hugging Face / GitHub (e.g. unsloth/Qwen2.5-Coder-7B-Instruct)",
    )
    parser.add_argument(
        "--dataset",
        type=str,
        default=os.path.join("packages", "ai-engine", "data", "speedpilot-finetune.jsonl"),
        help="Path to SpeedPilot JSONL fine-tuning dataset",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="speedpilot-ai-lora",
        help="Directory to save fine-tuned LoRA weights",
    )
    parser.add_argument(
        "--max-seq-length",
        type=int,
        default=2048,
        help="Maximum token sequence length",
    )
    parser.add_argument(
        "--steps",
        type=int,
        default=100,
        help="Maximum training steps",
    )
    parser.add_argument(
        "--export-gguf",
        action="store_true",
        default=True,
        help="Export quantized GGUF for Ollama / llama.cpp",
    )
    return parser.parse_args()

def main():
    args = parse_args()

    print(f"===========================================================")
    print(f" SpeedPilot AI - Free Model Training Pipeline")
    print(f" Framework: Unsloth (https://github.com/unslothai/unsloth)")
    print(f" Base Model: {args.model}")
    print(f" Dataset:    {args.dataset}")
    print(f" Target GGUF Export: {args.export_gguf}")
    print(f"===========================================================\n")

    if not os.path.exists(args.dataset):
        print(f"[ERROR] Dataset not found at {args.dataset}")
        print("Run 'npm run export:training' to build the dataset first.")
        sys.exit(1)

    with open(args.dataset, "r", encoding="utf-8") as f:
        sample_count = sum(1 for _ in f)
    print(f"[Dataset] Found {sample_count} gold-standard training pairs in {args.dataset}")

    try:
        from unsloth import FastLanguageModel
        from datasets import load_dataset
        from trl import SFTTrainer
        from transformers import TrainingArguments
    except ImportError:
        print("\n[INFO] Unsloth and training dependencies are not yet installed in this environment.")
        print("To execute this training script on GPU (Google Colab or Local Linux/WSL), install:")
        print("  pip install --no-deps \"unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git\"")
        print("  pip install --no-deps trl peft accelerate bitsandbytes datasets")
        print("\nOr open the automated Google Colab notebook at: notebooks/Train_SpeedPilot_AI_Free.ipynb")
        sys.exit(0)

    # 1. Load Base Model in 4-bit (Saves 80% VRAM, fits free Google Colab T4)
    print(f"\n[1/5] Loading 4-bit quantized base model: {args.model} ...")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=args.model,
        max_seq_length=args.max_seq_length,
        dtype=None,
        load_in_4bit=True,
    )

    # 2. Add LoRA Adapters (Rank 16, Alpha 16)
    print("\n[2/5] Injecting parameter-efficient LoRA adapters ...")
    model = FastLanguageModel.get_peft_model(
        model,
        r=16,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        lora_alpha=16,
        lora_dropout=0,
        bias="none",
        use_gradient_checkpointing="unsloth",
        random_state=3407,
        max_seq_length=args.max_seq_length,
    )

    # 3. Load & Format Dataset using Chat Template
    print(f"\n[3/5] Formatting SpeedPilot dataset with model chat template ...")
    raw_dataset = load_dataset("json", data_files=args.dataset, split="train")

    def format_prompts(batch):
        formatted_texts = []
        for conversation in batch["messages"]:
            text = tokenizer.apply_chat_template(
                conversation,
                tokenize=False,
                add_generation_prompt=False,
            )
            formatted_texts.append(text)
        return {"text": formatted_texts}

    dataset = raw_dataset.map(format_prompts, batched=True)

    # 4. Train with SFTTrainer
    print(f"\n[4/5] Starting supervised fine-tuning for {args.steps} steps ...")
    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        dataset_text_field="text",
        max_seq_length=args.max_seq_length,
        dataset_num_proc=2,
        packing=False,
        args=TrainingArguments(
            per_device_train_batch_size=2,
            gradient_accumulation_steps=4,
            warmup_steps=5,
            max_steps=args.steps,
            learning_rate=2e-4,
            fp16=not torch.cuda.is_bf16_supported(),
            bf16=torch.cuda.is_bf16_supported(),
            logging_steps=5,
            output_dir=args.output_dir,
            optim="adamw_8bit",
            weight_decay=0.01,
            lr_scheduler_type="linear",
            seed=3407,
        ),
    )

    trainer_stats = trainer.train()
    print(f"\nTraining completed! Loss: {trainer_stats.training_loss:.4f}")

    # 5. Export LoRA and Quantized GGUF
    print(f"\n[5/5] Saving fine-tuned LoRA weights to {args.output_dir} ...")
    model.save_pretrained(args.output_dir)
    tokenizer.save_pretrained(args.output_dir)

    if args.export_gguf:
        print("\nExporting quantized GGUF for Ollama (speedpilot-ai.gguf) ...")
        model.save_pretrained_gguf("speedpilot-ai-gguf", tokenizer, quantization_method="q4_k_m")
        print("\n[READY] Run locally in Ollama:")
        print("  ollama create speedpilot-ai -f Modelfile")
        print("  ollama run speedpilot-ai")

if __name__ == "__main__":
    main()
